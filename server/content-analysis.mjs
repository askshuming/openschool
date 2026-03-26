import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";
import { LESSON_PACKS } from "./content-items.mjs";
import {
  buildStudyRouteSummary,
  estimateStudyRouteTaskCount,
  getStudyRouteMeta,
  inferStudyRouteKind,
} from "./study-routes.mjs";

const textbookKeywords = ["教材", "课文", "语文", "上册", "下册", "单元"];
const worksheetKeywords = ["练习", "试卷", "习题", "作业", "训练", "测试", "阅读"];
const photoKeywords = ["板书", "课堂", "笔记", "拍照", "截图"];
const writingKeywords = ["作文", "习作", "写一写", "写作"];
const expressionKeywords = ["表达", "说一说", "口语", "讲一讲"];
const readingKeywords = ["阅读", "课文", "文中", "主旨", "中心思想", "哪一句", "哪句话"];
const scriptPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "scripts",
  "extract_content.swift",
);

function truncate(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function stripExtension(fileName = "") {
  return fileName.replace(/\.[^.]+$/, "");
}

function normalizeText(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

function includesKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferContentType({ source, preferredContentType, fileName = "", mimeType = "", text = "" }) {
  if (preferredContentType) {
    return preferredContentType;
  }
  const mergedText = `${fileName} ${text}`;
  const normalizedFileName = fileName.toLowerCase();
  if (mimeType === "application/pdf" || normalizedFileName.endsWith(".pdf")) {
    return "pdf";
  }
  if (includesKeyword(mergedText, textbookKeywords)) {
    return "textbook";
  }
  if (includesKeyword(mergedText, worksheetKeywords)) {
    return "worksheet";
  }
  if (includesKeyword(mergedText, photoKeywords)) {
    return "photo";
  }
  return source === "camera" ? "worksheet" : "photo";
}

function inferRecognizedFocus(focusLabel, text = "", fileName = "") {
  const corpus = `${focusLabel} ${fileName} ${text}`;
  if (includesKeyword(corpus, writingKeywords)) {
    return "写作";
  }
  if (includesKeyword(corpus, expressionKeywords)) {
    return "表达";
  }
  if (includesKeyword(corpus, readingKeywords)) {
    return "阅读";
  }
  return focusLabel || "阅读";
}

function skillLabel(skillTag) {
  switch (skillTag) {
    case "evidence_locating":
      return "证据句定位";
    case "main_idea":
      return "主旨概括";
    case "vocab":
      return "字词理解";
    case "sentence_understanding":
      return "句子理解";
    case "recitation":
      return "朗读跟读";
    default:
      return "阅读";
  }
}

function lessonScoreForText(lessonPack, normalizedCorpus) {
  let score = 0;
  const candidates = [
    lessonPack.title,
    lessonPack.mainIdea,
    ...lessonPack.paragraphs.map((item) => item.text),
    ...lessonPack.vocab.map((item) => item.word),
    ...lessonPack.evidenceBank.map((item) => item.evidenceText),
  ];

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate).replace(/\s+/g, "");
    if (!normalizedCandidate || normalizedCandidate.length < 2) {
      continue;
    }
    if (normalizedCorpus.includes(normalizedCandidate)) {
      score += normalizedCandidate.length > 4 ? 6 : 3;
    }
  }

  return score;
}

function matchLesson(text = "", fileName = "") {
  const normalizedCorpus = normalizeText(`${fileName} ${text}`).replace(/\s+/g, "");
  if (!normalizedCorpus) {
    return null;
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const lessonPack of Object.values(LESSON_PACKS)) {
    const score = lessonScoreForText(lessonPack, normalizedCorpus);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = lessonPack;
    }
  }

  if (!bestMatch || bestScore <= 0) {
    return null;
  }

  return {
    lessonId: bestMatch.id,
    lessonTitle: bestMatch.title,
    skillTag: bestMatch.focusSkillTag,
    textbookVersion: bestMatch.textbookVersion,
  };
}

function buildTitle({ fileName = "", gradeLabel, routeKind, contentType, lessonMatch }) {
  const baseName = stripExtension(fileName);
  if (lessonMatch?.lessonTitle) {
    return lessonMatch.lessonTitle;
  }
  if (baseName && baseName.length > 1) {
    return truncate(baseName, 18);
  }
  switch (routeKind) {
    case "reading_quiz":
      return `${gradeLabel}阅读题`;
    case "writing_prompt":
      return `${gradeLabel}作文题`;
    case "vocab_foundation":
      return `${gradeLabel}字词页`;
    default:
      break;
  }
  switch (contentType) {
    case "textbook":
      return `${gradeLabel}语文教材页`;
    case "worksheet":
      return `${gradeLabel}阅读练习题`;
    case "photo":
      return `${gradeLabel}学习图片`;
    case "pdf":
      return `${gradeLabel}学习 PDF`;
    default:
      return `${gradeLabel}学习内容`;
  }
}

function buildTags({ contentType, lessonMatch, recognizedFocus, routeLabel, textSnippet }) {
  return [
    contentType === "pdf" ? "PDF" : undefined,
    lessonMatch?.lessonTitle,
    lessonMatch ? skillLabel(lessonMatch.skillTag) : undefined,
    routeLabel,
    recognizedFocus,
    textSnippet ? "已识别原文" : undefined,
  ].filter(Boolean);
}

function buildConfidence(method, text) {
  if (method !== "heuristic" && text.length >= 12) {
    return "high";
  }
  if (method !== "heuristic" && text.length >= 4) {
    return "medium";
  }
  return "low";
}

function tryDecodePlainText(assetBase64, mimeType = "", fileName = "") {
  if (!assetBase64) {
    return "";
  }
  const looksLikeText =
    mimeType.startsWith("text/") || fileName.toLowerCase().endsWith(".txt") || fileName.toLowerCase().endsWith(".md");
  if (!looksLikeText) {
    return "";
  }

  try {
    return normalizeText(Buffer.from(assetBase64, "base64").toString("utf8"));
  } catch {
    return "";
  }
}

function runSwiftExtraction(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn("swift", [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Swift extraction timed out"));
    }, 8000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr || `Swift extractor exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(error);
      }
    });

    child.stdin.end(JSON.stringify(payload));
  });
}

export async function analyzeContentInput({
  source,
  fileName = "",
  mimeType = "",
  preferredContentType,
  gradeLabel,
  focusLabel,
  assetBase64,
}) {
  let extractedText = tryDecodePlainText(assetBase64, mimeType, fileName);
  let analysisMethod = extractedText ? "text_decode" : "heuristic";

  if (!extractedText && assetBase64) {
    try {
      const swiftResult = await runSwiftExtraction({
        assetBase64,
        mimeType,
        fileName,
      });
      extractedText = normalizeText(swiftResult?.text ?? "");
      analysisMethod = swiftResult?.method ?? "heuristic";
    } catch {
      analysisMethod = "heuristic";
    }
  }

  const contentType = inferContentType({
    source,
    preferredContentType,
    fileName,
    mimeType,
    text: extractedText,
  });
  const lessonMatch = matchLesson(extractedText, fileName);
  const recognizedFocus = inferRecognizedFocus(focusLabel, extractedText, fileName);
  const routeKind = inferStudyRouteKind({
    contentType,
    focusLabel: recognizedFocus,
    text: extractedText,
    fileName,
  });
  const routeMeta = getStudyRouteMeta(routeKind);
  const recognizedTextSnippet = extractedText ? truncate(extractedText, 48) : undefined;
  const confidence = buildConfidence(analysisMethod, extractedText);

  return {
    contentType,
    title: buildTitle({
      fileName,
      gradeLabel,
      routeKind,
      contentType,
      lessonMatch,
    }),
    summary: buildStudyRouteSummary(routeKind, lessonMatch?.lessonTitle, lessonMatch ? skillLabel(lessonMatch.skillTag) : undefined),
    routeKind,
    routeLabel: routeMeta.routeLabel,
    primaryChallenge: routeMeta.primaryChallenge,
    recommendedEntryStep: routeMeta.recommendedEntryStep,
    recognizedFocus,
    recognizedGradeLabel: gradeLabel,
    generatedTaskCount:
      lessonMatch
        ? 7
        : estimateStudyRouteTaskCount({ contentType, recognizedFocus, routeKind, recognizedTextSnippet }),
    textbookVersion:
      lessonMatch?.textbookVersion ??
      (contentType === "textbook" ? `部编版 ${gradeLabel} 语文` : undefined),
    recommendedLessonId: lessonMatch?.lessonId ?? null,
    matchedLessonTitle: lessonMatch?.lessonTitle,
    analysisMethod,
    confidence,
    recognizedTextSnippet,
    tags: buildTags({
      contentType,
      lessonMatch,
      recognizedFocus,
      routeLabel: routeMeta.routeLabel,
      textSnippet: recognizedTextSnippet,
    }),
  };
}
