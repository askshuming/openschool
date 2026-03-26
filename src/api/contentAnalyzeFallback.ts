import {
  ContentAnalyzeRequest,
  ContentAnalyzeResponse,
  ContentInputType,
} from "./contracts";
import {
  buildStudyRouteSummary,
  estimateStudyRouteTaskCount,
  getStudyRouteMeta,
  inferStudyRouteKind,
} from "../domain/studyRoutes";

const textbookKeywords = ["教材", "课文", "语文", "上册", "下册", "单元"];
const worksheetKeywords = ["练习", "试卷", "习题", "作业", "训练", "测试", "阅读"];
const photoKeywords = ["板书", "课堂", "笔记", "拍照", "截图"];

function includesKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function stripExtension(fileName?: string) {
  return fileName?.replace(/\.[^.]+$/, "") ?? "";
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function inferContentType(input: ContentAnalyzeRequest) {
  if (input.preferredContentType) {
    return input.preferredContentType;
  }
  const fileName = input.fileName ?? "";
  const normalizedFileName = fileName.toLowerCase();
  if (input.mimeType === "application/pdf" || normalizedFileName.endsWith(".pdf")) {
    return "pdf" as const;
  }
  if (includesKeyword(fileName, textbookKeywords)) {
    return "textbook" as const;
  }
  if (includesKeyword(fileName, worksheetKeywords)) {
    return "worksheet" as const;
  }
  if (includesKeyword(fileName, photoKeywords)) {
    return "photo" as const;
  }
  return input.source === "camera" ? ("worksheet" as const) : ("photo" as const);
}

function inferLessonMatch(fileName?: string) {
  const name = fileName ?? "";
  if (name.includes("观潮")) {
    return {
      lessonId: "g4_u1_l03",
      lessonTitle: "观潮",
      skillLabel: "证据句定位",
    };
  }
  if (name.includes("走月亮") || name.includes("阿妈")) {
    return {
      lessonId: "g4_u1_l04",
      lessonTitle: "走月亮",
      skillLabel: "主旨概括",
    };
  }
  return null;
}

function inferFocus(input: ContentAnalyzeRequest, fileName?: string) {
  const text = `${fileName ?? ""} ${input.focusLabel}`;
  if (text.includes("作文") || text.includes("习作") || text.includes("写一写")) {
    return "写作";
  }
  if (text.includes("表达") || text.includes("说一说") || text.includes("口语")) {
    return "表达";
  }
  return "阅读";
}

function buildDefaultTitle(contentType: ContentInputType, gradeLabel: string) {
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

function buildTags(contentType: ContentInputType, lessonTitle?: string, skillLabel?: string) {
  return [lessonTitle, skillLabel, contentType === "pdf" ? "PDF" : undefined].filter(
    (item): item is string => Boolean(item),
  );
}

export async function analyzeContentFallback(
  input: ContentAnalyzeRequest,
): Promise<ContentAnalyzeResponse> {
  const contentType = inferContentType(input);
  const lessonMatch = inferLessonMatch(input.fileName);
  const recognizedFocus = inferFocus(input, input.fileName);
  const routeKind = inferStudyRouteKind({
    contentType,
    focusLabel: input.focusLabel,
    fileName: input.fileName,
  });
  const routeMeta = getStudyRouteMeta(routeKind);
  const baseName = stripExtension(input.fileName);
  const title =
    baseName && baseName.length > 1 ? truncate(baseName, 18) : buildDefaultTitle(contentType, input.gradeLabel);

  return {
    requestId: `req_local_${Date.now()}`,
    contentType,
    title,
    summary: buildStudyRouteSummary(routeKind, lessonMatch?.lessonTitle, lessonMatch?.skillLabel),
    routeKind,
    routeLabel: routeMeta.routeLabel,
    primaryChallenge: routeMeta.primaryChallenge,
    recommendedEntryStep: routeMeta.recommendedEntryStep,
    recognizedFocus,
    recognizedGradeLabel: input.gradeLabel,
    generatedTaskCount:
      lessonMatch ? 7 : estimateStudyRouteTaskCount({ contentType, recognizedFocus, routeKind }),
    textbookVersion: contentType === "textbook" ? `部编版 ${input.gradeLabel} 语文` : undefined,
    recommendedLessonId: lessonMatch?.lessonId ?? null,
    matchedLessonTitle: lessonMatch?.lessonTitle,
    analysisMethod: "heuristic",
    confidence: lessonMatch ? "medium" : "low",
    recognizedTextSnippet: undefined,
    tags: buildTags(contentType, lessonMatch?.lessonTitle, lessonMatch?.skillLabel).concat(routeMeta.routeLabel),
  };
}
