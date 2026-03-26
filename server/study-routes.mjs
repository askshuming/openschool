const writingKeywords = ["作文", "习作", "写一写", "写话", "看图写话", "续写", "扩写"];
const expressionKeywords = ["表达", "说一说", "口语", "讲一讲"];
const vocabKeywords = ["生字", "字词", "词语", "拼音", "组词", "近义词", "反义词", "默写"];

function includesKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function inferStudyRouteKind({ contentType, focusLabel = "", fileName = "", text = "" }) {
  const corpus = `${focusLabel} ${fileName} ${text}`;
  if (includesKeyword(corpus, writingKeywords) || includesKeyword(corpus, expressionKeywords)) {
    return "writing_prompt";
  }
  if (includesKeyword(corpus, vocabKeywords)) {
    return "vocab_foundation";
  }
  if (contentType === "worksheet" || corpus.includes("题干") || corpus.includes("阅读")) {
    return "reading_quiz";
  }
  return "text_reading";
}

export function inferStudyRouteKindFromGenerationContext(context = {}) {
  if (context.routeKind) {
    return context.routeKind;
  }
  const corpus = [
    context.recognizedFocus,
    context.sourceSummary,
    context.recognizedTextSnippet,
    ...(context.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  if (corpus.includes("作文") || corpus.includes("写作") || corpus.includes("表达")) {
    return "writing_prompt";
  }
  if (corpus.includes("字词") || corpus.includes("生字") || corpus.includes("拼音")) {
    return "vocab_foundation";
  }
  if (context.contentType === "worksheet" || corpus.includes("题干") || corpus.includes("证据")) {
    return "reading_quiz";
  }
  return "text_reading";
}

export function inferStudyFocusMode(recognizedFocus = "") {
  if (recognizedFocus.includes("写")) {
    return "writing";
  }
  if (
    recognizedFocus.includes("表达") ||
    recognizedFocus.includes("口语") ||
    recognizedFocus.includes("说")
  ) {
    return "expression";
  }
  return "reading";
}

export function getStudyRouteMeta(routeKind) {
  switch (routeKind) {
    case "reading_quiz":
      return {
        routeLabel: "阅读题突破路线",
        primaryChallenge: "看不懂题干、找不到证据句、答案说不完整",
        recommendedEntryStep: "先圈题干关键词",
      };
    case "writing_prompt":
      return {
        routeLabel: "作文表达路线",
        primaryChallenge: "不会审题、没素材、不会开头",
        recommendedEntryStep: "先看清要求",
      };
    case "vocab_foundation":
      return {
        routeLabel: "字词巩固路线",
        primaryChallenge: "会认不会用、易混字总错",
        recommendedEntryStep: "先看懂字词",
      };
    default:
      return {
        routeLabel: "课文精读路线",
        primaryChallenge: "字词不懂、重点句抓不住、主旨说不清",
        recommendedEntryStep: "先读重点句",
      };
  }
}

export function buildStudyRouteSummary(routeKind, lessonTitle, skillLabel) {
  const routeMeta = getStudyRouteMeta(routeKind);

  if (lessonTitle && skillLabel) {
    return `已识别到《${lessonTitle}》相关内容，已匹配${routeMeta.routeLabel}，会先聚焦${skillLabel}。`;
  }

  switch (routeKind) {
    case "reading_quiz":
      return "已识别为阅读题，会先圈题干关键词，再回原文找依据。";
    case "writing_prompt":
      return "已识别为表达任务，会先看清要求，再整理素材和开头。";
    case "vocab_foundation":
      return "已识别为字词学习，会先看懂读音和意思，再做组词运用。";
    default:
      return "已识别为课文学习，会先读重点句，再逐步弄清主旨。";
  }
}

export function getStudyContentTypeLabel(contentType) {
  switch (contentType) {
    case "textbook":
      return "教材";
    case "worksheet":
      return "练习题";
    case "pdf":
      return "PDF";
    default:
      return "图片";
  }
}

export function shouldIncludeRecitationCard({ contentType, focusMode, routeKind, snippet }) {
  if (!snippet || focusMode === "writing") {
    return false;
  }
  if (routeKind !== "text_reading") {
    return false;
  }
  if (contentType !== "textbook" && contentType !== "photo") {
    return false;
  }
  return snippet.length >= 8 && snippet.length <= 42;
}

export function buildDynamicRouteCopy({
  routeKind,
  contentType,
  focusMode,
  sourceTitle,
  sourceSummary,
  canRecite,
}) {
  const routeMeta = getStudyRouteMeta(routeKind);
  const contentTypeLabel = getStudyContentTypeLabel(contentType);

  if (routeKind === "writing_prompt") {
    return {
      introGoals: [
        `先看清「${sourceTitle}」在写什么`,
        "先看要求，再整理素材和顺序",
        "最后完成 1 道短测确认能不能开始下笔",
      ],
      readingTitle: "要求理解卡",
      structureTitle: focusMode === "expression" ? "表达顺序卡" : "开头准备卡",
      structure:
        focusMode === "expression"
          ? ["先明确要表达什么", "再整理顺序", "最后完整说出"]
          : ["先看清要求", "再列出 2-3 个素材点", "最后组织一句开头"],
      mainIdea: `${routeMeta.routeLabel} · ${routeMeta.primaryChallenge}`,
      feedbackBody: "先看清要求和顺序，再继续往下做。",
      summaryLabel: focusMode === "expression" ? "表达顺序" : "开头准备",
    };
  }

  if (routeKind === "vocab_foundation") {
    return {
      introGoals: [
        `先看懂「${sourceTitle}」里的字词`,
        "先认读音和意思，再做组词运用",
        "最后完成 1 道短测确认是否记住了",
      ],
      readingTitle: "字词理解卡",
      structureTitle: "用法整理卡",
      structure: ["先看读音和词义", "再试着组词或造句", "最后完成短测"],
      mainIdea: `${routeMeta.routeLabel} · ${routeMeta.primaryChallenge}`,
      feedbackBody: "先把字词意思看懂，再继续往下做。",
      summaryLabel: "字词运用",
    };
  }

  if (routeKind === "reading_quiz") {
    return {
      introGoals: [
        `先判断「${sourceTitle}」在考什么`,
        "先圈题干关键词，再回原文找依据",
        "最后用一句完整的话答清",
      ],
      readingTitle: "题干定位卡",
      structureTitle: "答题线索卡",
      structure: ["先圈题干关键词", "再回材料找依据", "最后用一句话答清"],
      mainIdea: `${routeMeta.routeLabel} · ${routeMeta.primaryChallenge}`,
      feedbackBody: "先看清题目要求和线索，再继续往下做。",
      summaryLabel: "答题线索",
    };
  }

  if (contentType === "textbook") {
    return {
      introGoals: [
        `先看懂「${sourceTitle}」这一页在讲什么`,
        focusMode === "writing"
          ? "先学这一页怎么表达，再开始仿写"
          : focusMode === "expression"
            ? "先抓住画面和顺序，再开口表达"
            : "先抓住课文重点句，再进入短任务",
        canRecite ? "完成短测后跟读一遍，帮助记牢" : "完成 1 道短测确认是否真的看懂",
      ],
      readingTitle: focusMode === "writing" ? "表达句卡" : "课文精读卡",
      structureTitle:
        focusMode === "writing" ? "写法卡" : focusMode === "expression" ? "表达顺序卡" : "课文重点卡",
      structure:
        focusMode === "writing"
          ? ["先看课文怎么起句", "再看内容怎么展开", "最后试着仿写一句"]
          : focusMode === "expression"
            ? ["先说清谁在做什么", "再按顺序讲完整", "最后补上感受"]
            : ["先读重点句", "再理解句子意思", "最后完成短测"],
      mainIdea: sourceSummary,
      feedbackBody:
        focusMode === "writing" ? "先看清写法，再下笔，会更容易写顺。" : "先回看重点句，再继续下一步。",
      summaryLabel: "课文重点",
    };
  }

  if (contentType === "pdf") {
    return {
      introGoals: [
        `先提炼「${sourceTitle}」的重点`,
        focusMode === "writing"
          ? "先看清材料观点，再组织自己的表达"
          : focusMode === "expression"
            ? "先提炼要点，再按顺序说清楚"
            : "先抓标题和重点段，再进入短任务",
        "完成 1 道短测确认当前路线是否合适",
      ],
      readingTitle: "重点段卡",
      structureTitle:
        focusMode === "writing" ? "观点整理卡" : focusMode === "expression" ? "表达提纲卡" : "提炼卡",
      structure:
        focusMode === "writing"
          ? ["先看材料观点", "再整理自己的表达顺序", "最后再开始写"]
          : focusMode === "expression"
            ? ["先提炼要点", "再整理表达顺序", "最后完整说出"]
            : ["先看标题和重点段", "再提炼关键信息", "最后进入短练习"],
      mainIdea: sourceSummary,
      feedbackBody: "先抓重点，再继续往下学，会更省力。",
      summaryLabel: focusMode === "writing" ? "观点提炼" : focusMode === "expression" ? "表达提纲" : "重点提炼",
    };
  }

  return {
    introGoals: [
      `先还原这张${contentTypeLabel}里的关键信息`,
      focusMode === "writing"
        ? "先把图片里的信息整理成顺序，再试着表达"
        : focusMode === "expression"
          ? "先整理画面和顺序，再开口表达"
          : "先看清主要信息，再进入短任务",
      canRecite ? "完成短测后再跟读一遍，帮助记牢" : "完成 1 道短测确认理解是否准确",
    ],
    readingTitle: "还原卡",
    structureTitle: focusMode === "writing" ? "表达整理卡" : focusMode === "expression" ? "开口顺序卡" : "信息整理卡",
    structure:
      focusMode === "writing"
        ? ["先看清图片里的信息", "再整理成表达顺序", "最后试着说或写一句"]
        : focusMode === "expression"
          ? ["先说清画面主体", "再按顺序讲完整", "最后补上自己的理解"]
          : ["先看清主要信息", "再整理重点", "最后进入短练习"],
    mainIdea: sourceSummary,
    feedbackBody: "先把图片里的关键信息还原清楚，再继续往下学。",
    summaryLabel: focusMode === "writing" ? "表达顺序" : focusMode === "expression" ? "开口表达" : "关键信息",
  };
}

export function estimateStudyRouteTaskCount({
  contentType,
  recognizedFocus,
  routeKind,
  recognizedTextSnippet = "",
}) {
  const focusMode = inferStudyFocusMode(recognizedFocus);
  const canRecite = shouldIncludeRecitationCard({
    contentType,
    focusMode,
    routeKind,
    snippet: recognizedTextSnippet,
  });

  return canRecite ? 7 : 6;
}
