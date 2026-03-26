import {
  ActivityCard,
  CatalogResponse,
  GuardianConsentRecordResponse,
  GuardianConsentRevokeRequest,
  GuardianConsentRevokeResponse,
  GuardianConsentRequest,
  GuardianConsentResponse,
  ParentSignupRequest,
  ParentSignupResponse,
  ParentDataExportResponse,
  ParentSettingsResponse,
  ParentSettingsUpdateRequest,
  ChildProfileDeleteRequest,
  ChildProfileDeleteResponse,
  ProgressSummaryResponse,
  ReviewAnswerRequest,
  ReviewAnswerResponse,
  ReviewPracticeFeedback,
  ReviewQueueItem,
  ReviewQueueResponse,
  SessionAnswerRequest,
  SessionAnswerResponse,
  SessionFinishRequest,
  SessionFinishResponse,
  SessionRecitationRequest,
  SessionRecitationResponse,
  SessionStartRequest,
  SessionStartResponse,
  UpsertChildProfileRequest,
  UpsertChildProfileResponse,
  WeeklyReportResponse,
} from "./contracts";
import {
  buildDynamicRouteCopy,
  getStudyContentTypeLabel,
  inferStudyFocusMode,
  inferStudyRouteKindFromGenerationContext,
  shouldIncludeRecitationCard,
} from "../domain/studyRoutes";

const GENERATED_DYNAMIC_LESSON_ID = "generated_dynamic";
type DynamicContentType = NonNullable<SessionStartRequest["generationContext"]>["contentType"];

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function requestId() {
  return `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

const catalogLessons = [
  {
    id: "g4_u1_l03",
    title: "观潮",
    unitId: "u1",
    focusSkillTag: "evidence_locating" as const,
    parentSuggestion: "建议优先训练证据句定位：先圈题干关键词，再回原文找对应句。",
  },
  {
    id: "g4_u1_l04",
    title: "走月亮",
    unitId: "u1",
    focusSkillTag: "main_idea" as const,
    parentSuggestion: "建议优先训练主旨归纳：先说段意，再合并成完整中心句。",
  },
] as const;

const questionBank = {
  q_evidence_1: {
    correctIndex: 1,
    skillTag: "evidence_locating" as const,
    errorTag: "evidence_missed" as const,
    evidenceText: "自古以来被称为天下奇观。",
    whyWrong: "题目要找“有名”的证据句，不是一般描述。",
    retryQuestion: "再找一句能体现“奇观”的原文。",
  },
  q_moonlight_1: {
    correctIndex: 2,
    skillTag: "main_idea" as const,
    errorTag: "main_idea_off" as const,
    evidenceText: "啊，我和阿妈走月亮！",
    whyWrong: "主旨题要抓“人物关系 + 情感基调”，不能只看景物描写。",
    retryQuestion: "再选一句最能体现“我和阿妈感情”的句子。",
  },
} as const;

const cardsByLessonId: Record<string, ActivityCard[]> = {
  g4_u1_l03: [
    {
      id: "l03_intro",
      type: "intro",
      skillTag: "main_idea",
      payload: {
        title: "导学卡",
        goals: ["理解课文写了什么", "学会从文中找依据", "完成 1 道小测"],
      },
    },
    {
      id: "l03_vocab",
      type: "vocab",
      skillTag: "vocab",
      payload: {
        title: "字词卡",
        vocabItems: [
          {
            word: "奇观",
            pinyin: "qí guān",
            explanation: "雄伟美丽而少见的景象",
            example: "钱塘江大潮，自古以来被称为天下奇观。",
          },
          {
            word: "屹立",
            pinyin: "yì lì",
            explanation: "像山峰一样高耸而稳固",
            example: "高楼屹立在江边。",
          },
        ],
      },
    },
    {
      id: "l03_reading",
      type: "close_reading",
      skillTag: "sentence_understanding",
      payload: {
        title: "精读卡",
        paragraph: "钱塘江大潮，自古以来被称为天下奇观。",
        simpleExplanation: "钱塘江的潮水从古时候就很有名，大家都觉得很壮观。",
      },
    },
    {
      id: "l03_main",
      type: "main_idea",
      skillTag: "main_idea",
      payload: {
        title: "主旨卡",
        structure: ["潮来前的期待", "潮来时的声音和样子", "潮过后的感受"],
        mainIdea: "课文描写钱塘江大潮的壮丽景象，表达作者赞叹。",
      },
    },
    {
      id: "l03_quiz",
      type: "quiz",
      skillTag: "evidence_locating",
      payload: {
        title: "小测卡",
        questionId: "q_evidence_1",
        body: "哪句话最能说明钱塘江大潮非常有名？",
        options: [
          "江面很宽，水势很大。",
          "自古以来被称为天下奇观。",
          "大家早早来到江边等待。",
          "潮水来得很快。",
        ],
      },
    },
    {
      id: "l03_feedback",
      type: "feedback",
      skillTag: "evidence_locating",
      payload: {
        title: "反馈卡",
        body: "提交答案后查看错因和证据句。",
      },
    },
    {
      id: "l03_recitation",
      type: "recitation",
      skillTag: "recitation",
      payload: {
        title: "朗读卡",
        segmentId: "l03_seg_1",
        recitationText: "钱塘江大潮，自古以来被称为天下奇观。",
        recitationTip: "先听一遍示范，再按停顿朗读一遍。",
        durationSec: 20,
      },
    },
    {
      id: "l03_summary",
      type: "summary",
      skillTag: "main_idea",
      payload: {
        title: "收尾卡",
        mastered: ["奇观词义", "依据句定位", "主旨概括"],
        nextReview: "明天复习：证据句定位",
      },
    },
  ],
  g4_u1_l04: [
    {
      id: "l04_intro",
      type: "intro",
      skillTag: "main_idea",
      payload: {
        title: "导学卡",
        goals: ["感受月夜画面", "理解句子情感", "完成 1 道主旨题"],
      },
    },
    {
      id: "l04_vocab",
      type: "vocab",
      skillTag: "vocab",
      payload: {
        title: "字词卡",
        vocabItems: [
          {
            word: "汩汩",
            pinyin: "gǔ gǔ",
            explanation: "形容水流动的声音",
            example: "溪水汩汩地流着。",
          },
          {
            word: "柔和",
            pinyin: "róu hé",
            explanation: "温和而不刺眼",
            example: "月光柔和地洒在小路上。",
          },
        ],
      },
    },
    {
      id: "l04_reading",
      type: "close_reading",
      skillTag: "sentence_understanding",
      payload: {
        title: "精读卡",
        paragraph: "细细的溪水，流着山草和野花的香味。",
        simpleExplanation: "作者用视觉和嗅觉描写，让月夜更有画面感。",
      },
    },
    {
      id: "l04_main",
      type: "main_idea",
      skillTag: "main_idea",
      payload: {
        title: "主旨卡",
        structure: ["走月亮场景", "沿途景物描写", "亲情情感表达"],
        mainIdea: "文章通过“我”和阿妈走月亮，表达温暖亲情与夜色之美。",
      },
    },
    {
      id: "l04_quiz",
      type: "quiz",
      skillTag: "main_idea",
      payload: {
        title: "小测卡",
        questionId: "q_moonlight_1",
        body: "《走月亮》最想表达下面哪一层意思？",
        options: [
          "介绍月亮的科学知识。",
          "重点写夜晚天气变化。",
          "表现我和阿妈在月夜散步时的温暖情感。",
          "说明山路很难走。",
        ],
      },
    },
    {
      id: "l04_feedback",
      type: "feedback",
      skillTag: "main_idea",
      payload: {
        title: "反馈卡",
        body: "主旨题要同时关注人物关系和情感线索。",
      },
    },
    {
      id: "l04_recitation",
      type: "recitation",
      skillTag: "recitation",
      payload: {
        title: "朗读卡",
        segmentId: "l04_seg_1",
        recitationText: "啊，我和阿妈走月亮！",
        recitationTip: "先按语气停顿分句，再完整朗读一遍。",
        durationSec: 18,
      },
    },
    {
      id: "l04_summary",
      type: "summary",
      skillTag: "main_idea",
      payload: {
        title: "收尾卡",
        mastered: ["月夜画面感", "关键词提取", "主旨归纳"],
        nextReview: "明天复习：主旨与情感判断",
      },
    },
  ],
};

const sessionById = new Map<string, SessionStartResponse>();
const activeSessionByChild = new Map<string, string>();
const reviewDoneByChild = new Map<string, Set<string>>();
const recitationsByChild = new Map<string, RecitationRecord[]>();
const parentSettingsByParent = new Map<string, ParentSettingsRecord>();
const parentIds = new Set<string>();
const consentByParent = new Map<string, Omit<GuardianConsentRecordResponse, "requestId">>();
const childProfilesById = new Map<string, ChildProfileRecord>();
const sessionOwnerById = new Map<string, string>();
const answerAttemptsByChild = new Map<string, number>();

interface ReviewItemInternal extends Omit<ReviewQueueItem, "practice"> {
  practice: ReviewQueueItem["practice"];
  answer: {
    correctIndex: number;
    feedback: ReviewPracticeFeedback;
  };
}

interface RecitationRecord {
  lessonId: string;
  segmentId: string;
  durationSec: number;
  completedAt: string;
}

interface ParentSettingsRecord {
  parentId: string;
  studyDurationLimitMin: number;
  reminderTime: string;
  updatedAt: string;
}

interface ChildProfileRecord {
  childId: string;
  parentId: string;
  nickname: string;
  grade: "G1" | "G2" | "G3" | "G4" | "G5" | "G6";
  textbookVersion: string;
  interests: string[];
  readingLevel: "normal" | "struggling" | "very_struggling";
}

function buildDefaultParentSettings(parentId: string): ParentSettingsRecord {
  return {
    parentId,
    studyDurationLimitMin: 15,
    reminderTime: "19:30",
    updatedAt: new Date().toISOString(),
  };
}

function isValidReminderTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function assertParentExists(parentId: string) {
  if (!parentIds.has(parentId)) {
    throw new Error("家长账号不存在");
  }
}

function hasActiveConsent(parentId: string) {
  const consent = consentByParent.get(parentId);
  return Boolean(consent && consent.agreed && consent.childUnder14 && !consent.revokedAt);
}

function inferDynamicSkillTag(context?: SessionStartRequest["generationContext"]) {
  if (context?.routeKind === "vocab_foundation") {
    return "vocab" as const;
  }
  if (context?.routeKind === "writing_prompt") {
    return "structure" as const;
  }
  if (context?.routeKind === "reading_quiz") {
    return "evidence_locating" as const;
  }
  const focus = context?.recognizedFocus ?? "";
  if (focus.includes("写") || focus.includes("表达") || focus.includes("口语") || focus.includes("说")) {
    return "structure" as const;
  }

  const corpus = [
    context?.sourceSummary,
    context?.recognizedFocus,
    context?.recognizedTextSnippet,
    ...(context?.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  if (corpus.includes("证据") || corpus.includes("依据")) {
    return "evidence_locating" as const;
  }
  if (corpus.includes("主旨") || corpus.includes("中心")) {
    return "main_idea" as const;
  }
  if (corpus.includes("字词")) {
    return "vocab" as const;
  }
  return "sentence_understanding" as const;
}

function buildDynamicQuiz(
  context: SessionStartRequest["generationContext"] | undefined,
  contentType: DynamicContentType | undefined,
  focusMode: "reading" | "writing" | "expression",
  skillTag: ActivityCard["skillTag"],
  routeKind: NonNullable<SessionStartRequest["generationContext"]>["routeKind"],
  snippet: string,
  sourceTitle: string,
  sourceSummary: string,
) {
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

function buildDynamicCards(context?: SessionStartRequest["generationContext"]): ActivityCard[] {
  const routeKind = inferStudyRouteKindFromGenerationContext(context);
  const skillTag = inferDynamicSkillTag(context);
  const focusMode = inferStudyFocusMode(
    `${context?.recognizedFocus ?? ""} ${(context?.tags ?? []).join(" ")}`,
  );
  const contentType = context?.contentType ?? "photo";
  const sourceTitle = context?.sourceTitle ?? "拍照输入内容";
  const sourceSummary = context?.sourceSummary ?? "系统已按当前内容安排好可开始的学习路线。";
  const snippet =
    context?.recognizedTextSnippet ?? `${sourceTitle}的重点内容已经识别完成，先从最关键的一步开始。`;
  const quizPayload = buildDynamicQuiz(
    context,
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

  const cards: ActivityCard[] = [
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
        body: quizPayload.body,
        options: quizPayload.options,
        correctIndex: quizPayload.correctIndex,
        evidenceText: quizPayload.evidenceText,
        whyWrong: quizPayload.whyWrong,
        retryQuestion: quizPayload.retryQuestion,
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
      mastered: [sourceTitle, contentTypeLabel, routeCopy.summaryLabel, context?.recognizedFocus ?? "阅读"],
      nextReview: `明天复习：${routeCopy.summaryLabel}`,
    },
  });

  return cards;
}

function buildCards(lessonId: string, generationContext?: SessionStartRequest["generationContext"]): ActivityCard[] {
  if (lessonId === GENERATED_DYNAMIC_LESSON_ID) {
    return JSON.parse(JSON.stringify(buildDynamicCards(generationContext)));
  }
  const cards = cardsByLessonId[lessonId];
  if (!cards) {
    throw new Error("课程不存在");
  }
  return JSON.parse(JSON.stringify(cards));
}

function resolveSessionQuestion(session: SessionStartResponse, questionId: string) {
  const question = questionBank[inputQuestionKey(questionId)];
  if (question) {
    return question;
  }
  const quizCard = session.cards.find(
    (card) => card.type === "quiz" && card.payload.questionId === questionId,
  );
  if (!quizCard) {
    return null;
  }
  return {
    correctIndex: quizCard.payload.correctIndex ?? 0,
    skillTag: quizCard.skillTag,
    errorTag:
      (quizCard.skillTag === "main_idea" ? "main_idea_off" : "evidence_missed") as
        | "evidence_missed"
        | "main_idea_off",
    evidenceText: quizCard.payload.evidenceText ?? "",
    whyWrong: quizCard.payload.whyWrong ?? "先回看上一张卡，再试一次。",
    retryQuestion: quizCard.payload.retryQuestion ?? "再选一个更合适的答案。",
  };
}

function inputQuestionKey(questionId: string) {
  return questionId as keyof typeof questionBank;
}

export async function signupParent(
  input: ParentSignupRequest,
): Promise<ParentSignupResponse> {
  await delay(380);
  if (!input.account || !input.code) {
    throw new Error("请输入账号和验证码");
  }
  const parentId = `parent_${Date.now()}`;
  parentIds.add(parentId);
  parentSettingsByParent.set(parentId, buildDefaultParentSettings(parentId));
  return {
    requestId: requestId(),
    parentId,
  };
}

export async function submitGuardianConsent(
  input: GuardianConsentRequest,
): Promise<GuardianConsentResponse> {
  await delay(320);
  assertParentExists(input.parentId);
  if (!input.agreed || !input.childUnder14) {
    throw new Error("请先完成监护人同意");
  }
  const consentId = `consent_${Date.now()}`;
  const agreedAt = new Date().toISOString();
  consentByParent.set(input.parentId, {
    consentId,
    parentId: input.parentId,
    relation: input.relation,
    childUnder14: input.childUnder14,
    agreed: input.agreed,
    agreedAt,
  });
  return {
    requestId: requestId(),
    consentId,
    agreedAt,
  };
}

export async function getGuardianConsentRecord(
  parentId: string,
): Promise<GuardianConsentRecordResponse> {
  await delay(180);
  assertParentExists(parentId);
  const record = consentByParent.get(parentId);
  if (!record) {
    throw new Error("未找到监护人同意记录");
  }
  return {
    requestId: requestId(),
    ...record,
  };
}

export async function revokeGuardianConsent(
  input: GuardianConsentRevokeRequest,
): Promise<GuardianConsentRevokeResponse> {
  await delay(180);
  assertParentExists(input.parentId);
  const record = consentByParent.get(input.parentId);
  if (!record) {
    throw new Error("未找到监护人同意记录");
  }
  if (!record.revokedAt) {
    record.revokedAt = new Date().toISOString();
    consentByParent.set(input.parentId, record);
  }
  return {
    requestId: requestId(),
    consentId: record.consentId,
    parentId: input.parentId,
    status: "revoked",
    revokedAt: record.revokedAt,
  };
}

export async function upsertChildProfile(
  input: UpsertChildProfileRequest,
): Promise<UpsertChildProfileResponse> {
  await delay(420);
  if (!input.nickname.trim()) {
    throw new Error("请填写孩子昵称");
  }
  assertParentExists(input.parentId);
  if (!hasActiveConsent(input.parentId)) {
    throw new Error("请先完成监护人同意");
  }
  const childId = `child_${Date.now()}`;
  childProfilesById.set(childId, {
    childId,
    parentId: input.parentId,
    nickname: input.nickname,
    grade: input.grade,
    textbookVersion: input.textbookVersion,
    interests: input.interests,
    readingLevel: input.readingLevel,
  });
  return {
    requestId: requestId(),
    childId,
  };
}

export async function getCatalog(): Promise<CatalogResponse> {
  await delay(180);
  return {
    requestId: requestId(),
    grades: ["G1", "G2", "G3", "G4", "G5", "G6"],
    textbookVersions: ["PEP"],
    lessons: [...catalogLessons],
  };
}

export async function startSession(
  input: SessionStartRequest,
): Promise<SessionStartResponse> {
  await delay(460);
  if (!childProfilesById.has(input.childId)) {
    throw new Error("孩子档案不存在");
  }
  const currentActiveId = activeSessionByChild.get(input.childId);
  if (!input.forceNew && currentActiveId && sessionById.has(currentActiveId)) {
    const activeSession = sessionById.get(currentActiveId)!;
    return {
      ...activeSession,
      requestId: requestId(),
    };
  }
  if (!cardsByLessonId[input.lessonId] && input.lessonId !== GENERATED_DYNAMIC_LESSON_ID) {
    throw new Error("课程不存在");
  }
  if (input.lessonId === GENERATED_DYNAMIC_LESSON_ID && !input.generationContext?.sourceTitle) {
    throw new Error("缺少生成上下文");
  }

  const nextSession: SessionStartResponse = {
    requestId: requestId(),
    sessionId: `sess_${Date.now()}`,
    lessonId: input.lessonId,
    cards: buildCards(input.lessonId, input.generationContext),
  };
  sessionById.set(nextSession.sessionId, nextSession);
  sessionOwnerById.set(nextSession.sessionId, input.childId);
  activeSessionByChild.set(input.childId, nextSession.sessionId);
  return nextSession;
}

export async function answerSession(
  input: SessionAnswerRequest,
): Promise<SessionAnswerResponse> {
  await delay(360);
  const session = sessionById.get(input.sessionId);
  if (!session) {
    throw new Error("会话不存在");
  }
  const isQuestionInSession = session.cards.some(
    (card) => card.type === "quiz" && card.payload.questionId === input.questionId,
  );
  if (!isQuestionInSession) {
    throw new Error("题目不存在");
  }
  const question = resolveSessionQuestion(session, input.questionId);
  if (!question) {
    throw new Error("题目不存在");
  }

  const correct = input.selectedIndex === question.correctIndex;
  const childId = sessionOwnerById.get(input.sessionId);
  if (childId) {
    const prev = answerAttemptsByChild.get(childId) ?? 0;
    answerAttemptsByChild.set(childId, prev + 1);
  }
  return {
    requestId: requestId(),
    correct,
    skillTag: question.skillTag,
    errorTag: correct ? undefined : question.errorTag,
    feedback: {
      whyWrong: correct ? "定位准确，继续保持。" : question.whyWrong,
      evidenceText: question.evidenceText,
      retryQuestion: question.retryQuestion,
    },
  };
}

export async function finishSession(
  input: SessionFinishRequest,
): Promise<SessionFinishResponse> {
  await delay(220);
  if (!sessionById.has(input.sessionId)) {
    throw new Error("会话不存在");
  }
  sessionById.delete(input.sessionId);
  sessionOwnerById.delete(input.sessionId);
  for (const [childId, activeSessionId] of activeSessionByChild.entries()) {
    if (activeSessionId === input.sessionId) {
      activeSessionByChild.delete(childId);
      break;
    }
  }
  return {
    requestId: requestId(),
    sessionId: input.sessionId,
    status: "finished",
  };
}

export async function submitSessionRecitation(
  input: SessionRecitationRequest,
): Promise<SessionRecitationResponse> {
  await delay(260);
  if (!cardsByLessonId[input.lessonId]) {
    throw new Error("课程不存在");
  }
  const segmentId = input.segmentId ?? "seg_1";
  const completedAt = new Date().toISOString();
  const childRecitations = recitationsByChild.get(input.childId) ?? [];
  childRecitations.push({
    lessonId: input.lessonId,
    segmentId,
    durationSec: input.durationSec ?? 0,
    completedAt,
  });
  recitationsByChild.set(input.childId, childRecitations);
  return {
    requestId: requestId(),
    status: "recorded",
    segmentId,
    completedAt,
    message: "本段朗读已记录，继续保持。",
  };
}

function buildReviewItemsInternal(childId: string): ReviewItemInternal[] {
  const items: ReviewItemInternal[] = [
    {
      id: "r1",
      targetType: "vocab",
      title: "奇观（词义辨析）",
      dueAt: "today",
      status: "pending",
      difficulty: "basic",
      practice: {
        stem: "“奇观”在课文中更接近下面哪个意思？",
        options: ["平常景色", "雄伟而少见的景象", "天气变化", "江面宽度"],
      },
      answer: {
        correctIndex: 1,
        feedback: {
          correctMessage: "词义判断很准确，继续保持。",
          wrongMessage: "先看词语所在句，再抓“奇”和“观”两个关键词。",
          evidence: "课文中“天下奇观”强调的是“少见且壮观”的景象。",
        },
      },
    },
    {
      id: "r2",
      targetType: "evidence_locating",
      title: "找出描写潮声的依据句",
      dueAt: "today",
      status: "pending",
      difficulty: "medium",
      practice: {
        stem: "哪句最能作为“钱塘江大潮非常有名”的依据？",
        options: [
          "潮水来得很快。",
          "自古以来被称为天下奇观。",
          "很多人站在江边。",
          "江面非常宽阔。",
        ],
      },
      answer: {
        correctIndex: 1,
        feedback: {
          correctMessage: "依据句找得很准。",
          wrongMessage: "题目问“有名”，优先找直接表达“闻名/奇观”的句子。",
          evidence: "“自古以来被称为天下奇观”直接体现“有名”。",
        },
      },
    },
    {
      id: "r3",
      targetType: "main_idea",
      title: "《观潮》主旨一句话",
      dueAt: "tomorrow",
      status: "pending",
      difficulty: "medium",
      practice: {
        stem: "下面哪一句最贴近《观潮》这篇课文的主旨？",
        options: [
          "江边很热闹，大家都很开心。",
          "课文主要写了钱塘江大潮的壮丽景象。",
          "作者重点介绍了江边天气变化。",
          "文章主要讲了古诗背诵技巧。",
        ],
      },
      answer: {
        correctIndex: 1,
        feedback: {
          correctMessage: "主旨概括方向正确。",
          wrongMessage: "主旨要覆盖全文核心内容，不只抓局部细节。",
          evidence: "文章围绕潮来前、潮来时、潮过后展开，核心是“大潮壮观”。",
        },
      },
    },
    {
      id: "r4",
      targetType: "recitation",
      title: "《古诗三首》背诵片段 2",
      dueAt: "3d",
      status: "done",
      difficulty: "advanced",
      practice: {
        stem: "开始背诵前，哪种做法更有助于准确朗读？",
        options: ["直接加速背", "先听一遍示范并划分停顿", "跳过难句", "只背最后一句"],
      },
      answer: {
        correctIndex: 1,
        feedback: {
          correctMessage: "方法选得很好，先听后读更稳。",
          wrongMessage: "先建立节奏和停顿，再背诵会更准确。",
          evidence: "先听示范并划分停顿，可以显著降低漏字和错断句。",
        },
      },
    },
  ];

  const doneSet = reviewDoneByChild.get(childId) ?? new Set();
  return items.map((item) => {
    if (doneSet.has(item.id)) {
      return {
        ...item,
        status: "done",
      };
    }
    return item;
  });
}

function toPublicReviewItem(item: ReviewItemInternal): ReviewQueueItem {
  return {
    id: item.id,
    targetType: item.targetType,
    title: item.title,
    dueAt: item.dueAt,
    status: item.status,
    difficulty: item.difficulty,
    practice: item.practice,
  };
}

export async function getReviewQueue(childId = "child_demo"): Promise<ReviewQueueResponse> {
  await delay(240);
  const items = buildReviewItemsInternal(childId).map(toPublicReviewItem);
  return {
    requestId: requestId(),
    items,
  };
}

export async function submitReviewAnswer(
  input: ReviewAnswerRequest,
): Promise<ReviewAnswerResponse> {
  await delay(260);
  const currentItems = buildReviewItemsInternal(input.childId);
  const reviewItem = currentItems.find((item) => item.id === input.reviewId);
  if (!reviewItem) {
    throw new Error("复习条目不存在");
  }
  if (
    input.selectedIndex < 0 ||
    input.selectedIndex >= reviewItem.practice.options.length
  ) {
    throw new Error("选项序号超出范围");
  }
  const correct = input.selectedIndex === reviewItem.answer.correctIndex;
  if (correct) {
    const doneSet = reviewDoneByChild.get(input.childId) ?? new Set();
    doneSet.add(input.reviewId);
    reviewDoneByChild.set(input.childId, doneSet);
  }
  const isAlreadyDone = reviewDoneByChild.get(input.childId)?.has(input.reviewId) ?? false;
  const status =
    reviewItem.status === "done" || isAlreadyDone || correct ? "done" : "pending";
  return {
    requestId: requestId(),
    reviewId: input.reviewId,
    correct,
    status,
    nextDueAt: status === "done" ? "7d" : "today",
    feedback: {
      message: correct
        ? reviewItem.answer.feedback.correctMessage
        : reviewItem.answer.feedback.wrongMessage,
      evidence: reviewItem.answer.feedback.evidence,
    },
  };
}

export async function getProgressSummary(): Promise<ProgressSummaryResponse> {
  await delay(210);
  return {
    requestId: requestId(),
    completedLessons: 4,
    averageDurationMin: 9,
    masteredTags: ["vocab", "evidence_locating", "main_idea"],
  };
}

export async function getWeeklyReport(childId = "child_demo"): Promise<WeeklyReportResponse> {
  await delay(260);
  const recitations = recitationsByChild.get(childId) ?? [];
  const unstableSegments = [
    ...new Set(
      recitations
        .filter((item) => item.durationSec > 0 && item.durationSec < 12)
        .map((item) => item.segmentId),
    ),
  ];
  return {
    requestId: requestId(),
    weeklyCompletedLessons: 4,
    averageDurationMin: 9,
    errorDistribution: {
      vocab_unknown: 0.34,
      evidence_missed: 0.41,
      main_idea_off: 0.25,
    },
    recitation: {
      completedCount: recitations.length,
      unstableSegments,
    },
  };
}

export async function getParentSettings(parentId: string): Promise<ParentSettingsResponse> {
  await delay(180);
  const existing = parentSettingsByParent.get(parentId);
  if (existing) {
    return {
      requestId: requestId(),
      ...existing,
    };
  }
  const fallback = buildDefaultParentSettings(parentId);
  parentSettingsByParent.set(parentId, fallback);
  return {
    requestId: requestId(),
    ...fallback,
  };
}

export async function updateParentSettings(
  input: ParentSettingsUpdateRequest,
): Promise<ParentSettingsResponse> {
  await delay(220);
  if (input.studyDurationLimitMin < 5 || input.studyDurationLimitMin > 120) {
    throw new Error("学习时长需在 5 到 120 分钟之间");
  }
  if (!isValidReminderTime(input.reminderTime)) {
    throw new Error("提醒时间格式无效，请使用 HH:mm");
  }
  const settings: ParentSettingsRecord = {
    parentId: input.parentId,
    studyDurationLimitMin: input.studyDurationLimitMin,
    reminderTime: input.reminderTime,
    updatedAt: new Date().toISOString(),
  };
  parentSettingsByParent.set(input.parentId, settings);
  return {
    requestId: requestId(),
    ...settings,
  };
}

export async function getParentDataExport(
  parentId: string,
  childId: string,
): Promise<ParentDataExportResponse> {
  await delay(260);
  assertParentExists(parentId);
  const child = childProfilesById.get(childId);
  if (!child) {
    throw new Error("孩子档案不存在");
  }
  if (child.parentId !== parentId) {
    throw new Error("当前账号无权查看该孩子数据");
  }

  const progressSummary = await getProgressSummary();
  const weeklyReport = await getWeeklyReport(childId);
  return {
    requestId: requestId(),
    parentId,
    childId,
    exportedAt: new Date().toISOString(),
    profile: {
      nickname: child.nickname,
      grade: child.grade,
      textbookVersion: child.textbookVersion,
      interests: child.interests,
      readingLevel: child.readingLevel,
    },
    progressSummary: {
      completedLessons: progressSummary.completedLessons,
      averageDurationMin: progressSummary.averageDurationMin,
      masteredTags: progressSummary.masteredTags,
    },
    weeklyReport: {
      weeklyCompletedLessons: weeklyReport.weeklyCompletedLessons,
      averageDurationMin: weeklyReport.averageDurationMin,
    },
    attemptsCount: answerAttemptsByChild.get(childId) ?? 0,
    recitationsCount: (recitationsByChild.get(childId) ?? []).length,
  };
}

export async function deleteChildProfile(
  input: ChildProfileDeleteRequest,
): Promise<ChildProfileDeleteResponse> {
  await delay(260);
  assertParentExists(input.parentId);
  const child = childProfilesById.get(input.childId);
  if (!child) {
    throw new Error("孩子档案不存在");
  }
  if (child.parentId !== input.parentId) {
    throw new Error("当前账号无权查看该孩子数据");
  }

  childProfilesById.delete(input.childId);
  reviewDoneByChild.delete(input.childId);
  recitationsByChild.delete(input.childId);
  answerAttemptsByChild.delete(input.childId);
  const activeSessionId = activeSessionByChild.get(input.childId);
  if (activeSessionId) {
    activeSessionByChild.delete(input.childId);
    sessionById.delete(activeSessionId);
    sessionOwnerById.delete(activeSessionId);
  }
  for (const [sessionId, ownerChildId] of sessionOwnerById.entries()) {
    if (ownerChildId === input.childId) {
      sessionOwnerById.delete(sessionId);
      sessionById.delete(sessionId);
    }
  }

  return {
    requestId: requestId(),
    childId: input.childId,
    status: "deleted",
    deletedAt: new Date().toISOString(),
  };
}
