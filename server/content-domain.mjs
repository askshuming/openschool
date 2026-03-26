import { LESSON_CARDS_BY_ID, LESSON_PACKS, QUESTION_BANK } from "./content-items.mjs";
import {
  buildDynamicRouteCopy,
  getStudyContentTypeLabel,
  inferStudyFocusMode,
  inferStudyRouteKindFromGenerationContext,
  shouldIncludeRecitationCard,
} from "./study-routes.mjs";

export const GENERATED_DYNAMIC_LESSON_ID = "generated_dynamic";

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateLessonPacks() {
  const lessonIds = Object.keys(LESSON_PACKS);
  assert(lessonIds.length > 0, "LESSON_PACKS must not be empty");

  for (const lessonId of lessonIds) {
    const lesson = LESSON_PACKS[lessonId];
    const source = `LESSON_PACKS.${lessonId}`;
    assert(lesson?.id === lessonId, `${source}: id must equal key`);
    assert(typeof lesson.title === "string" && lesson.title.length > 0, `${source}: title is required`);
    assert(typeof lesson.grade === "string" && lesson.grade.length > 0, `${source}: grade is required`);
    assert(
      typeof lesson.textbookVersion === "string" && lesson.textbookVersion.length > 0,
      `${source}: textbookVersion is required`,
    );
    assert(
      typeof lesson.focusSkillTag === "string" && lesson.focusSkillTag.length > 0,
      `${source}: focusSkillTag is required`,
    );
    assert(
      typeof lesson.parentSuggestion === "string" && lesson.parentSuggestion.length > 0,
      `${source}: parentSuggestion is required`,
    );
    assert(Array.isArray(lesson.paragraphs) && lesson.paragraphs.length > 0, `${source}: paragraphs is required`);
  }
}

function validateQuestionBank() {
  const questionIds = Object.keys(QUESTION_BANK);
  assert(questionIds.length > 0, "QUESTION_BANK must not be empty");

  for (const questionId of questionIds) {
    const question = QUESTION_BANK[questionId];
    const source = `QUESTION_BANK.${questionId}`;
    assert(Number.isInteger(question.correctIndex), `${source}: correctIndex must be an integer`);
    assert(typeof question.skillTag === "string" && question.skillTag.length > 0, `${source}: skillTag is required`);
    assert(typeof question.errorTag === "string" && question.errorTag.length > 0, `${source}: errorTag is required`);
  }
}

function validateLessonCards() {
  for (const [lessonId, cards] of Object.entries(LESSON_CARDS_BY_ID)) {
    const source = `LESSON_CARDS_BY_ID.${lessonId}`;
    assert(LESSON_PACKS[lessonId], `${source}: lessonId not found in LESSON_PACKS`);
    assert(Array.isArray(cards) && cards.length > 0, `${source}: cards must not be empty`);

    const seenCardIds = new Set();
    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      const cardSource = `${source}[${i}]`;
      assert(typeof card.id === "string" && card.id.length > 0, `${cardSource}: id is required`);
      assert(!seenCardIds.has(card.id), `${cardSource}: duplicate card id \"${card.id}\"`);
      seenCardIds.add(card.id);

      if (card.type === "quiz") {
        const questionId = card.payload?.questionId;
        const options = card.payload?.options;
        assert(typeof questionId === "string" && questionId.length > 0, `${cardSource}: payload.questionId is required`);
        assert(QUESTION_BANK[questionId], `${cardSource}: questionId \"${questionId}\" not found`);
        assert(Array.isArray(options) && options.length >= 2, `${cardSource}: quiz options must contain at least 2 items`);

        const correctIndex = QUESTION_BANK[questionId].correctIndex;
        assert(
          correctIndex >= 0 && correctIndex < options.length,
          `${cardSource}: question correctIndex out of quiz options range`,
        );
      }

      if (card.type === "recitation") {
        const segmentId = card.payload?.segmentId;
        const recitationText = card.payload?.recitationText;
        assert(
          typeof segmentId === "string" && segmentId.length > 0,
          `${cardSource}: payload.segmentId is required`,
        );
        assert(
          typeof recitationText === "string" && recitationText.length > 0,
          `${cardSource}: payload.recitationText is required`,
        );
      }
    }
  }
}

function validateContentConfig() {
  validateLessonPacks();
  validateQuestionBank();
  validateLessonCards();
}

validateContentConfig();

export function hasLessonPack(lessonId) {
  return Boolean(lessonId && LESSON_PACKS[lessonId]);
}

export function isGeneratedDynamicLesson(lessonId) {
  return lessonId === GENERATED_DYNAMIC_LESSON_ID;
}

export function getLessonPack(lessonId) {
  const lesson = LESSON_PACKS[lessonId];
  return lesson ? cloneData(lesson) : null;
}

function inferSkillTagFromContext(generationContext) {
  if (generationContext?.routeKind === "vocab_foundation") {
    return "vocab";
  }
  if (generationContext?.routeKind === "writing_prompt") {
    return "structure";
  }
  if (generationContext?.routeKind === "reading_quiz") {
    return "evidence_locating";
  }
  const focus = generationContext?.recognizedFocus ?? "";
  if (focus.includes("写") || focus.includes("表达") || focus.includes("口语") || focus.includes("说")) {
    return "structure";
  }

  const corpus = [
    generationContext?.sourceSummary,
    generationContext?.recognizedFocus,
    generationContext?.recognizedTextSnippet,
    ...(generationContext?.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  if (corpus.includes("证据") || corpus.includes("依据")) {
    return "evidence_locating";
  }
  if (corpus.includes("主旨") || corpus.includes("中心")) {
    return "main_idea";
  }
  if (corpus.includes("字词")) {
    return "vocab";
  }
  return "sentence_understanding";
}

function buildDynamicQuiz(generationContext, contentType, focusMode, skillTag, routeKind, snippet, sourceTitle, sourceSummary) {
  if (routeKind === "vocab_foundation") {
    return {
      correctIndex: 1,
      body: "面对这页字词内容，第一步更适合先做什么？",
      options: [
        "直接整页默写，不用先看读音和意思。",
        "先看清字词读音和意思，再做组词或运用。",
        "只记住页面颜色，不需要看词语本身。",
        "先跳过去做别的，最后再回来猜。",
      ],
      evidenceText: sourceSummary || snippet,
      whyWrong: "字词先要看懂读音和意思，再做组词、造句或默写才更稳。",
      retryQuestion: "再选一个更适合作为字词学习第一步的动作。",
    };
  }
  if (focusMode === "writing") {
    return {
      correctIndex: 1,
      body: "下面哪一个更适合作为这次写作学习的第一步？",
      options: [
        "直接开始写整段，不用先看要求和结构。",
        contentType === "worksheet"
          ? "先看清题目要求，再决定先写什么。"
          : contentType === "textbook"
            ? `先看「${sourceTitle}」这一页怎么表达，再试着仿写一句。`
            : contentType === "pdf"
              ? "先提炼材料里的观点，再组织自己的表达。"
              : "先把图片里的信息整理成顺序，再试着表达。",
        "先背一段现成答案，不需要理解内容。",
        "只看页面颜色和排版，再开始写。",
      ],
      evidenceText: snippet,
      whyWrong: "写作第一步不是直接下笔，而是先看清要求或表达方式，再决定怎么写。",
      retryQuestion: "再选一个更适合作为下笔前的动作。",
    };
  }

  if (focusMode === "expression") {
    return {
      correctIndex: 1,
      body: "下面哪一个更适合作为这次表达练习的第一步？",
      options: [
        "想到什么说什么，不需要先整理顺序。",
        contentType === "worksheet"
          ? "先看任务要求，再想先说哪一点。"
          : contentType === "textbook"
            ? "先抓住画面和顺序，再开口表达。"
            : contentType === "pdf"
              ? "先提炼要点，再按顺序说清楚。"
              : "先把图片里的关键信息整理出来，再开口表达。",
        "先跳过理解，直接整段背诵。",
        "只记住几个词，不需要连成完整表达。",
      ],
      evidenceText: sourceSummary || snippet,
      whyWrong: "表达前要先把内容和顺序理顺，直接开口会更容易说乱。",
      retryQuestion: "再选一个更适合开口前的准备动作。",
    };
  }

  if (contentType === "worksheet") {
    return {
      correctIndex: 1,
      body: "面对这页练习，第一步更适合先做什么？",
      options: [
        "直接看答案，不用管题目在问什么。",
        "先圈题干关键词，再回内容里找线索。",
        "先把整页题全部跳过，后面再说。",
        "只看题号，不需要读材料。",
      ],
      evidenceText: snippet,
      whyWrong: "练习页要先看清题目在考什么，再回材料找依据，不能直接猜。",
      retryQuestion: "再选一个更适合先做的动作。",
    };
  }

  if (contentType === "pdf") {
    return {
      correctIndex: 1,
      body: "面对这份材料，第一步更适合先做什么？",
      options: [
        "直接跳到最后一页看结论，不用先理解内容。",
        "先看标题和重点段，再决定从哪一步开始学。",
        "只记住文件名，不需要关注正文。",
        "先做题，做错了再回来看材料。",
      ],
      evidenceText: sourceSummary || snippet,
      whyWrong: "PDF 信息往往更长，先抓标题和重点段，学习才不会散。",
      retryQuestion: "再选一个更适合作为第一步的动作。",
    };
  }

  if (contentType === "textbook" && skillTag === "main_idea") {
    return {
      correctIndex: 1,
      body: "下面哪一个更适合作为这次学习的第一步？",
      options: [
        "只需要记住几个零散词语，不用理解整页内容。",
        `先概括「${sourceTitle}」在说什么，再进入短练习。`,
        "只看图片颜色和排版，不需要关注知识点。",
        "先跳过理解，直接做完整套大题。",
      ],
      evidenceText: sourceSummary || snippet,
      whyWrong: "这一页更适合先说清大意，再进入练习，不要一上来就做整套题。",
      retryQuestion: "再选一个更适合作为第一步的学习动作。",
    };
  }

  return {
    correctIndex: 1,
    body: "下面哪一个最值得先看清？",
    options: [
      contentType === "photo" ? "先记住图片颜色和拍摄角度。" : "先记住页面颜色和排版。",
      contentType === "photo" ? "先把图片里的关键信息还原清楚。" : `先抓住这句重点：「${snippet}」`,
      contentType === "textbook" ? "先背完整页，不需要理解重点句。" : "直接跳到最后一题看答案。",
      contentType === "photo" ? "只看边角内容，不需要管主要信息。" : "只看题号，不需要读内容。",
    ],
    evidenceText: snippet,
    whyWrong:
      contentType === "photo"
        ? "拍照内容要先还原关键信息，再进入练习，不然容易学偏。"
        : "第一步要先抓住这页最关键的一句或一个知识点。",
    retryQuestion: "再选一句最值得先看清的内容。",
  };
}

function buildDynamicCards(generationContext = {}) {
  const routeKind = inferStudyRouteKindFromGenerationContext(generationContext);
  const skillTag = inferSkillTagFromContext(generationContext);
  const focusMode = inferStudyFocusMode(
    `${generationContext.recognizedFocus ?? ""} ${(generationContext.tags ?? []).join(" ")}`,
  );
  const contentType = generationContext.contentType || "photo";
  const sourceTitle = generationContext.sourceTitle || "拍照输入内容";
  const sourceSummary = generationContext.sourceSummary || "系统已按当前内容安排好可开始的学习路线。";
  const snippet =
    generationContext.recognizedTextSnippet ||
    `${sourceTitle}的重点内容已经识别完成，先从最关键的一步开始。`;
  const quiz = buildDynamicQuiz(
    generationContext,
    contentType,
    focusMode,
    skillTag,
    routeKind,
    snippet,
    sourceTitle,
    sourceSummary,
  );
  const canRecite = shouldIncludeRecitationCard({
    contentType,
    focusMode,
    routeKind,
    snippet,
  });
  const contentTypeLabel = getStudyContentTypeLabel(contentType);
  const routeCopy = buildDynamicRouteCopy({
    routeKind,
    contentType,
    focusMode,
    sourceTitle,
    sourceSummary,
    canRecite,
  });

  const cards = [
    {
      id: "dyn_intro",
      type: "intro",
      skillTag: "main_idea",
      payload: {
        title: "导学卡",
        goals: routeCopy.introGoals,
      },
    },
    {
      id: "dyn_reading",
      type: "close_reading",
      skillTag,
      payload: {
        title: routeCopy.readingTitle,
        paragraph: snippet,
        simpleExplanation: sourceSummary,
      },
    },
    {
      id: "dyn_main",
      type: "main_idea",
      skillTag: "main_idea",
      payload: {
        title: routeCopy.structureTitle,
        structure: routeCopy.structure,
        mainIdea: routeCopy.mainIdea,
      },
    },
    {
      id: "dyn_quiz",
      type: "quiz",
      skillTag,
      payload: {
        title: "确认卡",
        questionId: "dynamic_q_1",
        body: quiz.body,
        options: quiz.options,
        correctIndex: quiz.correctIndex,
        evidenceText: quiz.evidenceText,
        whyWrong: quiz.whyWrong,
        retryQuestion: quiz.retryQuestion,
      },
    },
    {
      id: "dyn_feedback",
      type: "feedback",
      skillTag,
      payload: {
        title: "反馈卡",
        body: routeCopy.feedbackBody,
      },
    },
  ];

  if (canRecite) {
    cards.push({
      id: "dyn_recitation",
      type: "recitation",
      skillTag: "recitation",
      payload: {
        title: "跟读卡",
        segmentId: "dyn_seg_1",
        recitationText: snippet,
        recitationTip: "先听停顿，再跟读一遍，把节奏和重点一起记住。",
        durationSec: 18,
      },
    });
  }

  cards.push({
    id: "dyn_summary",
    type: "summary",
    skillTag: "main_idea",
    payload: {
      title: "收尾卡",
      mastered: [sourceTitle, contentTypeLabel, routeCopy.summaryLabel, generationContext.recognizedFocus || "阅读"],
      nextReview: `明天复习：${routeCopy.summaryLabel}`,
    },
  });

  return cards;
}

export function buildCardsForLesson(lessonId, generationContext) {
  if (isGeneratedDynamicLesson(lessonId)) {
    return cloneData(buildDynamicCards(generationContext));
  }
  const cards = LESSON_CARDS_BY_ID[lessonId];
  return cards ? cloneData(cards) : [];
}

export function getQuestionById(questionId) {
  const question = QUESTION_BANK[questionId];
  return question ? cloneData(question) : null;
}

export function listCatalogLessons() {
  return Object.values(LESSON_PACKS).map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    unitId: lesson.unitId ?? "u1",
    focusSkillTag: lesson.focusSkillTag,
    parentSuggestion: lesson.parentSuggestion,
  }));
}

export function listCatalogGrades() {
  const grades = new Set(Object.values(LESSON_PACKS).map((lesson) => lesson.grade));
  return [...grades];
}

export function listCatalogTextbookVersions() {
  const versions = new Set(Object.values(LESSON_PACKS).map((lesson) => lesson.textbookVersion));
  return [...versions];
}
