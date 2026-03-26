import Fastify from "fastify";
import cors from "@fastify/cors";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const HOST = process.env.HOST ?? "127.0.0.1";

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function fail(req, reply, statusCode, errorCode, message, details) {
  return reply.code(statusCode).send({
    requestId: req.requestContext?.requestId ?? id("req"),
    errorCode,
    message,
    details,
  });
}

const lessonPacks = {
  g4_u1_l03: {
    id: "g4_u1_l03",
    title: "观潮",
    genre: "modern_text",
    grade: "G4",
    textbookVersion: "PEP",
    paragraphs: [
      {
        id: "p1",
        text: "钱塘江大潮，自古以来被称为天下奇观。",
        simpleExplanation: "钱塘江的潮水很有名，古时候起就被认为很壮观。",
        summary: "开头点出钱塘江大潮很壮观。",
        keySentenceIds: ["s1"],
      },
    ],
    vocab: [
      {
        word: "奇观",
        pinyin: "qí guān",
        explanation: "雄伟美丽而少见的景象",
        contextSentence: "钱塘江大潮，自古以来被称为天下奇观。",
      },
    ],
    structureMap: ["写潮来前的期待", "写潮来时的声音和样子", "写潮过后的感受"],
    mainIdea: "课文描写了钱塘江大潮的壮丽景象，表达了作者的赞叹。",
    evidenceBank: [
      {
        questionId: "q_evidence_1",
        paragraphId: "p1",
        evidenceText: "自古以来被称为天下奇观",
      },
    ],
  },
};

const questionBank = {
  q_evidence_1: {
    correctIndex: 1,
    skillTag: "evidence_locating",
    errorTag: "evidence_missed",
    evidenceText: "自古以来被称为天下奇观。",
    whyWrong: "题目要找“有名”的依据句，不是一般描述。",
    retryQuestion: "再找一句能体现“奇观”的原文。",
  },
};

function buildCards() {
  return [
    {
      id: "c_intro",
      type: "intro",
      skillTag: "main_idea",
      payload: {
        title: "导学卡",
        goals: ["理解课文写了什么", "学会从文中找依据", "完成 1 道小测"],
      },
    },
    {
      id: "c_vocab",
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
      id: "c_reading",
      type: "close_reading",
      skillTag: "sentence_understanding",
      payload: {
        title: "精读卡",
        paragraph: "钱塘江大潮，自古以来被称为天下奇观。",
        simpleExplanation: "钱塘江的潮水从古时候就很有名，大家都觉得很壮观。",
      },
    },
    {
      id: "c_main",
      type: "main_idea",
      skillTag: "main_idea",
      payload: {
        title: "主旨卡",
        structure: ["潮来前的期待", "潮来时的声音和样子", "潮过后的感受"],
        mainIdea: "课文描写钱塘江大潮的壮丽景象，表达作者赞叹。",
      },
    },
    {
      id: "c_quiz",
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
      id: "c_feedback",
      type: "feedback",
      skillTag: "evidence_locating",
      payload: {
        title: "反馈卡",
        body: "提交答案后查看错因和证据句。",
      },
    },
    {
      id: "c_summary",
      type: "summary",
      skillTag: "main_idea",
      payload: {
        title: "收尾卡",
        mastered: ["奇观词义", "依据句定位", "主旨概括"],
        nextReview: "明天复习：证据句定位",
      },
    },
  ];
}

const db = {
  parents: new Map(),
  consents: new Map(),
  children: new Map(),
  parentSettings: new Map(),
  sessions: new Map(),
  activeSessionByChild: new Map(),
  attempts: [],
  recitations: [],
};

function buildDefaultParentSettings(parentId) {
  return {
    parentId,
    studyDurationLimitMin: 15,
    reminderTime: "19:30",
    updatedAt: nowIso(),
  };
}

function ensureParentSettings(parentId) {
  const existing = db.parentSettings.get(parentId);
  if (existing) {
    return existing;
  }
  const defaults = buildDefaultParentSettings(parentId);
  db.parentSettings.set(parentId, defaults);
  return defaults;
}

function pickChildId(childId) {
  if (childId && db.children.has(childId)) {
    return childId;
  }
  return db.children.keys().next().value ?? null;
}

function latestConsentByParent(parentId) {
  const records = [...db.consents.values()].filter((item) => item.parentId === parentId);
  if (records.length === 0) {
    return null;
  }
  records.sort((a, b) => b.agreedAt.localeCompare(a.agreedAt));
  return records[0];
}

function hasActiveConsentByParent(parentId) {
  const consent = latestConsentByParent(parentId);
  return Boolean(consent && consent.agreed && consent.childUnder14 && !consent.revokedAt);
}

function reviewQueueForChild(childId) {
  const base = [
    {
      id: "r1",
      targetType: "vocab",
      title: "奇观（词义辨析）",
      dueAt: "today",
      status: "pending",
      difficulty: "basic",
    },
    {
      id: "r2",
      targetType: "evidence_locating",
      title: "找出描写潮声的依据句",
      dueAt: "today",
      status: "pending",
      difficulty: "medium",
    },
    {
      id: "r3",
      targetType: "main_idea",
      title: "《观潮》主旨一句话",
      dueAt: "tomorrow",
      status: "pending",
      difficulty: "medium",
    },
    {
      id: "r4",
      targetType: "recitation",
      title: "《古诗三首》背诵片段 2",
      dueAt: "3d",
      status: "done",
      difficulty: "advanced",
    },
  ];
  const childAttempts = db.attempts.filter((x) => x.childId === childId);
  if (childAttempts.some((x) => x.errorTag === "evidence_missed")) {
    base.unshift({
      id: id("retry"),
      targetType: "evidence_locating",
      title: "错题回顾：依据句定位",
      dueAt: "today",
      status: "pending",
      difficulty: "medium",
    });
  }
  return base;
}

function progressSummaryForChild(childId) {
  const childAttempts = db.attempts.filter((x) => x.childId === childId);
  const skillSet = new Set(childAttempts.filter((x) => x.correct).map((x) => x.skillTag));
  const learned = skillSet.size > 0 ? [...skillSet] : ["vocab", "evidence_locating", "main_idea"];
  return {
    completedLessons: 4,
    averageDurationMin: 9,
    masteredTags: learned,
  };
}

function weeklyReportForChild(childId) {
  const childAttempts = db.attempts.filter((x) => x.childId === childId);
  const childRecitations = db.recitations.filter((x) => x.childId === childId);
  const unstableSegments = [
    ...new Set(
      childRecitations
        .filter((x) => x.durationSec > 0 && x.durationSec < 12)
        .map((x) => x.segmentId),
    ),
  ];
  const total = childAttempts.length || 1;
  const vocabUnknown = childAttempts.filter((x) => x.errorTag === "vocab_unknown").length / total;
  const evidenceMissed = childAttempts.filter((x) => x.errorTag === "evidence_missed").length / total;
  const mainIdeaOff = childAttempts.filter((x) => x.errorTag === "main_idea_off").length / total;
  return {
    weeklyCompletedLessons: 4,
    averageDurationMin: 9,
    errorDistribution: {
      vocab_unknown: Number(vocabUnknown.toFixed(2)) || 0.34,
      evidence_missed: Number(evidenceMissed.toFixed(2)) || 0.41,
      main_idea_off: Number(mainIdeaOff.toFixed(2)) || 0.25,
    },
    recitation: {
      completedCount: childRecitations.length,
      unstableSegments,
    },
  };
}

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

app.addHook("onRequest", async (req) => {
  req.requestContext = { requestId: id("req") };
});

app.setErrorHandler((error, req, reply) => {
  if (error.validation) {
    const details = error.validation.map((item) => ({
      path: item.instancePath || item.schemaPath,
      message: item.message,
      keyword: item.keyword,
    }));
    return fail(
      req,
      reply,
      400,
      "VALIDATION_ERROR",
      "Invalid request parameters",
      details,
    );
  }
  req.log.error(error);
  return fail(req, reply, 500, "INTERNAL_ERROR", "Internal server error");
});

app.setNotFoundHandler((req, reply) => {
  return fail(req, reply, 404, "NOT_FOUND", "Route not found");
});

const schemas = {
  parentSignupBody: {
    type: "object",
    required: ["account", "code"],
    additionalProperties: false,
    properties: {
      account: { type: "string", minLength: 1 },
      code: { type: "string", minLength: 1 },
    },
  },
  guardianConsentBody: {
    type: "object",
    required: ["parentId", "relation", "childUnder14", "agreed"],
    additionalProperties: false,
    properties: {
      parentId: { type: "string", minLength: 1 },
      relation: { type: "string", enum: ["father", "mother", "other_guardian"] },
      childUnder14: { type: "boolean" },
      agreed: { type: "boolean" },
    },
  },
  childProfileBody: {
    type: "object",
    required: ["parentId", "nickname"],
    additionalProperties: true,
    properties: {
      parentId: { type: "string", minLength: 1 },
      childId: { type: "string" },
      nickname: { type: "string", minLength: 1 },
      grade: { type: "string" },
      textbookVersion: { type: "string" },
      interests: {
        type: "array",
        items: { type: "string" },
      },
      readingLevel: { type: "string" },
    },
  },
  childProfileDeleteBody: {
    type: "object",
    required: ["parentId", "childId"],
    additionalProperties: false,
    properties: {
      parentId: { type: "string", minLength: 1 },
      childId: { type: "string", minLength: 1 },
    },
  },
  lessonPackParams: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", minLength: 1 },
    },
  },
  sessionStartBody: {
    type: "object",
    required: ["childId", "lessonId"],
    additionalProperties: false,
    properties: {
      childId: { type: "string", minLength: 1 },
      lessonId: { type: "string", minLength: 1 },
      forceNew: { type: "boolean" },
    },
  },
  sessionAnswerBody: {
    type: "object",
    required: ["sessionId", "questionId", "selectedIndex"],
    additionalProperties: false,
    properties: {
      sessionId: { type: "string", minLength: 1 },
      questionId: { type: "string", minLength: 1 },
      selectedIndex: { type: "integer", minimum: 0 },
    },
  },
  sessionFinishBody: {
    type: "object",
    required: ["sessionId", "completed"],
    additionalProperties: false,
    properties: {
      sessionId: { type: "string", minLength: 1 },
      completed: { type: "boolean" },
    },
  },
  sessionRecitationBody: {
    type: "object",
    required: ["childId", "lessonId"],
    additionalProperties: false,
    properties: {
      childId: { type: "string", minLength: 1 },
      lessonId: { type: "string", minLength: 1 },
      segmentId: { type: "string" },
      durationSec: { type: "number", minimum: 0 },
    },
  },
  childQuery: {
    type: "object",
    additionalProperties: false,
    properties: {
      childId: { type: "string" },
    },
  },
  weeklyReportQuery: {
    type: "object",
    additionalProperties: false,
    properties: {
      childId: { type: "string" },
      parentId: { type: "string" },
    },
  },
  parentSettingsQuery: {
    type: "object",
    additionalProperties: false,
    properties: {
      parentId: { type: "string" },
    },
  },
  consentRecordQuery: {
    type: "object",
    required: ["parentId"],
    additionalProperties: false,
    properties: {
      parentId: { type: "string", minLength: 1 },
    },
  },
  consentRevokeBody: {
    type: "object",
    required: ["parentId"],
    additionalProperties: false,
    properties: {
      parentId: { type: "string", minLength: 1 },
    },
  },
  parentSettingsBody: {
    type: "object",
    required: ["parentId", "studyDurationLimitMin", "reminderTime"],
    additionalProperties: false,
    properties: {
      parentId: { type: "string", minLength: 1 },
      studyDurationLimitMin: { type: "integer", minimum: 5, maximum: 120 },
      reminderTime: {
        type: "string",
        pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$",
      },
    },
  },
  parentExportQuery: {
    type: "object",
    required: ["parentId", "childId"],
    additionalProperties: false,
    properties: {
      parentId: { type: "string", minLength: 1 },
      childId: { type: "string", minLength: 1 },
    },
  },
};

app.get("/health", async (req) => {
  return {
    requestId: req.requestContext.requestId,
    ok: true,
    ts: nowIso(),
  };
});

app.post(
  "/parent/signup",
  {
    schema: {
      body: schemas.parentSignupBody,
    },
  },
  async (req) => {
    const { account } = req.body ?? {};
    const parentId = id("parent");
    db.parents.set(parentId, { parentId, account, createdAt: nowIso() });
    ensureParentSettings(parentId);
    return {
      requestId: req.requestContext.requestId,
      parentId,
    };
  },
);

app.post(
  "/consent/guardian",
  {
    schema: {
      body: schemas.guardianConsentBody,
    },
  },
  async (req, reply) => {
    const { parentId, relation, childUnder14, agreed } = req.body ?? {};
    if (!db.parents.has(parentId)) {
      return fail(req, reply, 404, "PARENT_NOT_FOUND", "Parent not found");
    }
    if (!agreed || !childUnder14) {
      return fail(req, reply, 409, "CONSENT_REQUIRED", "Consent required");
    }
    const consentId = id("consent");
    const agreedAt = nowIso();
    db.consents.set(consentId, {
      consentId,
      parentId,
      relation: relation ?? "other_guardian",
      childUnder14: Boolean(childUnder14),
      agreed: Boolean(agreed),
      agreedAt,
    });
    return {
      requestId: req.requestContext.requestId,
      consentId,
      agreedAt,
    };
  },
);

app.get(
  "/consent/record",
  {
    schema: {
      querystring: schemas.consentRecordQuery,
    },
  },
  async (req, reply) => {
    const { parentId } = req.query;
    if (!db.parents.has(parentId)) {
      return fail(req, reply, 404, "PARENT_NOT_FOUND", "Parent not found");
    }
    const consent = latestConsentByParent(parentId);
    if (!consent) {
      return fail(req, reply, 404, "CONSENT_NOT_FOUND", "Guardian consent record not found");
    }
    return {
      requestId: req.requestContext.requestId,
      ...consent,
    };
  },
);

app.post(
  "/consent/revoke",
  {
    schema: {
      body: schemas.consentRevokeBody,
    },
  },
  async (req, reply) => {
    const { parentId } = req.body ?? {};
    if (!db.parents.has(parentId)) {
      return fail(req, reply, 404, "PARENT_NOT_FOUND", "Parent not found");
    }
    const consent = latestConsentByParent(parentId);
    if (!consent) {
      return fail(req, reply, 404, "CONSENT_NOT_FOUND", "Guardian consent record not found");
    }
    if (!consent.revokedAt) {
      consent.revokedAt = nowIso();
      db.consents.set(consent.consentId, consent);
    }
    return {
      requestId: req.requestContext.requestId,
      consentId: consent.consentId,
      parentId,
      status: "revoked",
      revokedAt: consent.revokedAt,
    };
  },
);

app.post(
  "/child-profile",
  {
    schema: {
      body: schemas.childProfileBody,
    },
  },
  async (req, reply) => {
    const {
      parentId,
      childId: incomingChildId,
      nickname,
      grade,
      textbookVersion,
      interests,
      readingLevel,
    } = req.body ?? {};

    if (!db.parents.has(parentId)) {
      return fail(req, reply, 404, "PARENT_NOT_FOUND", "Parent not found");
    }
    if (!hasActiveConsentByParent(parentId)) {
      return fail(req, reply, 409, "CONSENT_REQUIRED", "Consent required");
    }

    const childId =
      incomingChildId && db.children.has(incomingChildId) ? incomingChildId : id("child");
    db.children.set(childId, {
      childId,
      parentId,
      nickname,
      grade: grade ?? "G4",
      textbookVersion: textbookVersion ?? "PEP",
      interests: interests ?? [],
      readingLevel: readingLevel ?? "normal",
      updatedAt: nowIso(),
    });

    return {
      requestId: req.requestContext.requestId,
      childId,
    };
  },
);

app.post(
  "/child-profile/delete",
  {
    schema: {
      body: schemas.childProfileDeleteBody,
    },
  },
  async (req, reply) => {
    const { parentId, childId } = req.body ?? {};
    if (!db.parents.has(parentId)) {
      return fail(req, reply, 404, "PARENT_NOT_FOUND", "Parent not found");
    }
    if (!db.children.has(childId)) {
      return fail(req, reply, 404, "CHILD_NOT_FOUND", "Child not found");
    }
    const child = db.children.get(childId);
    if (child?.parentId !== parentId) {
      return fail(
        req,
        reply,
        409,
        "PARENT_CHILD_MISMATCH",
        "Parent does not own this child profile",
      );
    }

    db.children.delete(childId);
    db.attempts = db.attempts.filter((item) => item.childId !== childId);
    db.recitations = db.recitations.filter((item) => item.childId !== childId);
    const activeSessionId = db.activeSessionByChild.get(childId);
    if (activeSessionId) {
      db.sessions.delete(activeSessionId);
      db.activeSessionByChild.delete(childId);
    }

    return {
      requestId: req.requestContext.requestId,
      childId,
      status: "deleted",
      deletedAt: nowIso(),
    };
  },
);

app.get("/catalog", async (req) => {
  return {
    requestId: req.requestContext.requestId,
    grades: ["G4"],
    textbookVersions: ["PEP"],
    lessons: [
      {
        id: "g4_u1_l03",
        title: "观潮",
        unitId: "u1",
      },
    ],
  };
});

app.get(
  "/lesson-pack/:id",
  {
    schema: {
      params: schemas.lessonPackParams,
    },
  },
  async (req, reply) => {
    const lessonId = req.params.id;
    const lessonPack = lessonPacks[lessonId];
    if (!lessonPack) {
      return fail(req, reply, 404, "LESSON_PACK_NOT_FOUND", "Lesson pack not found");
    }
    return {
      requestId: req.requestContext.requestId,
      lessonPack,
    };
  },
);

app.post(
  "/session/start",
  {
    schema: {
      body: schemas.sessionStartBody,
    },
  },
  async (req, reply) => {
    const { childId, lessonId, forceNew } = req.body ?? {};
    if (!db.children.has(childId)) {
      return fail(req, reply, 404, "CHILD_NOT_FOUND", "Child not found");
    }
    const lessonPack = lessonPacks[lessonId];
    if (!lessonPack) {
      return fail(req, reply, 404, "LESSON_NOT_FOUND", "Lesson not found");
    }

    const activeSessionId = db.activeSessionByChild.get(childId);
    if (!forceNew && activeSessionId && db.sessions.has(activeSessionId)) {
      const activeSession = db.sessions.get(activeSessionId);
      return {
        requestId: req.requestContext.requestId,
        sessionId: activeSession.sessionId,
        lessonId: activeSession.lessonId,
        cards: activeSession.cards,
      };
    }

    const sessionId = id("sess");
    const cards = buildCards();
    db.sessions.set(sessionId, {
      sessionId,
      childId,
      lessonId,
      cards,
      createdAt: nowIso(),
    });
    db.activeSessionByChild.set(childId, sessionId);

    return {
      requestId: req.requestContext.requestId,
      sessionId,
      lessonId,
      cards,
    };
  },
);

app.post(
  "/session/answer",
  {
    schema: {
      body: schemas.sessionAnswerBody,
    },
  },
  async (req, reply) => {
    const { sessionId, questionId, selectedIndex } = req.body ?? {};
    if (!db.sessions.has(sessionId)) {
      return fail(req, reply, 404, "SESSION_NOT_FOUND", "Session not found");
    }
    const question = questionBank[questionId];
    if (!question) {
      return fail(req, reply, 404, "QUESTION_NOT_FOUND", "Question not found");
    }
    const session = db.sessions.get(sessionId);
    const correct = selectedIndex === question.correctIndex;
    db.attempts.push({
      attemptId: id("attempt"),
      childId: session.childId,
      lessonId: session.lessonId,
      questionId,
      selectedIndex,
      correct,
      skillTag: question.skillTag,
      errorTag: correct ? null : question.errorTag,
      createdAt: nowIso(),
    });

    return {
      requestId: req.requestContext.requestId,
      correct,
      skillTag: question.skillTag,
      errorTag: correct ? undefined : question.errorTag,
      feedback: {
        whyWrong: correct ? "定位准确，继续保持。" : question.whyWrong,
        evidenceText: question.evidenceText,
        retryQuestion: question.retryQuestion,
      },
    };
  },
);

app.post(
  "/session/finish",
  {
    schema: {
      body: schemas.sessionFinishBody,
    },
  },
  async (req, reply) => {
    const { sessionId, completed } = req.body ?? {};
    if (!db.sessions.has(sessionId)) {
      return fail(req, reply, 404, "SESSION_NOT_FOUND", "Session not found");
    }
    if (completed !== true) {
      return fail(
        req,
        reply,
        409,
        "SESSION_NOT_COMPLETED",
        "Session must be completed before finishing",
      );
    }
    const session = db.sessions.get(sessionId);
    db.sessions.delete(sessionId);
    if (db.activeSessionByChild.get(session.childId) === sessionId) {
      db.activeSessionByChild.delete(session.childId);
    }
    return {
      requestId: req.requestContext.requestId,
      sessionId,
      status: "finished",
    };
  },
);

app.post(
  "/session/recitation",
  {
    schema: {
      body: schemas.sessionRecitationBody,
    },
  },
  async (req) => {
    const { childId, lessonId, segmentId, durationSec } = req.body ?? {};
    const recordedSegmentId = segmentId ?? "seg_1";
    const completedAt = nowIso();
    db.recitations.push({
      recitationId: id("rec"),
      childId,
      lessonId,
      segmentId: recordedSegmentId,
      durationSec: durationSec ?? 0,
      createdAt: completedAt,
    });
    return {
      requestId: req.requestContext.requestId,
      status: "recorded",
      segmentId: recordedSegmentId,
      completedAt,
      message: "本段朗读已记录，继续保持。",
    };
  },
);

app.get(
  "/review-queue",
  {
    schema: {
      querystring: schemas.childQuery,
    },
  },
  async (req) => {
    const childId = pickChildId(req.query.childId);
    return {
      requestId: req.requestContext.requestId,
      items: reviewQueueForChild(childId),
    };
  },
);

app.get(
  "/progress-summary",
  {
    schema: {
      querystring: schemas.childQuery,
    },
  },
  async (req) => {
    const childId = pickChildId(req.query.childId);
    const summary = progressSummaryForChild(childId);
    return {
      requestId: req.requestContext.requestId,
      ...summary,
    };
  },
);

app.get(
  "/parent/settings",
  {
    schema: {
      querystring: schemas.parentSettingsQuery,
    },
  },
  async (req, reply) => {
    const requestedParentId = req.query.parentId;
    if (requestedParentId && !db.parents.has(requestedParentId)) {
      return fail(req, reply, 404, "PARENT_NOT_FOUND", "Parent not found");
    }
    const parentId = requestedParentId ?? db.parents.keys().next().value ?? null;
    if (!parentId) {
      return fail(req, reply, 404, "PARENT_NOT_FOUND", "Parent not found");
    }
    const settings = ensureParentSettings(parentId);
    return {
      requestId: req.requestContext.requestId,
      ...settings,
    };
  },
);

app.get(
  "/parent/export-data",
  {
    schema: {
      querystring: schemas.parentExportQuery,
    },
  },
  async (req, reply) => {
    const { parentId, childId } = req.query;
    if (!db.parents.has(parentId)) {
      return fail(req, reply, 404, "PARENT_NOT_FOUND", "Parent not found");
    }
    if (!db.children.has(childId)) {
      return fail(req, reply, 404, "CHILD_NOT_FOUND", "Child not found");
    }
    const child = db.children.get(childId);
    if (child?.parentId !== parentId) {
      return fail(
        req,
        reply,
        409,
        "PARENT_CHILD_MISMATCH",
        "Parent does not own this child profile",
      );
    }
    const progressSummary = progressSummaryForChild(childId);
    const weeklyReport = weeklyReportForChild(childId);
    const attemptsCount = db.attempts.filter((item) => item.childId === childId).length;
    const recitationsCount = db.recitations.filter((item) => item.childId === childId).length;
    return {
      requestId: req.requestContext.requestId,
      parentId,
      childId,
      exportedAt: nowIso(),
      profile: {
        nickname: child.nickname,
        grade: child.grade,
        textbookVersion: child.textbookVersion,
        interests: child.interests,
        readingLevel: child.readingLevel,
      },
      progressSummary,
      weeklyReport: {
        weeklyCompletedLessons: weeklyReport.weeklyCompletedLessons,
        averageDurationMin: weeklyReport.averageDurationMin,
      },
      attemptsCount,
      recitationsCount,
    };
  },
);

app.post(
  "/parent/settings",
  {
    schema: {
      body: schemas.parentSettingsBody,
    },
  },
  async (req, reply) => {
    const { parentId, studyDurationLimitMin, reminderTime } = req.body ?? {};
    if (!db.parents.has(parentId)) {
      return fail(req, reply, 404, "PARENT_NOT_FOUND", "Parent not found");
    }
    const settings = {
      parentId,
      studyDurationLimitMin,
      reminderTime,
      updatedAt: nowIso(),
    };
    db.parentSettings.set(parentId, settings);
    return {
      requestId: req.requestContext.requestId,
      ...settings,
    };
  },
);

app.get(
  "/parent/weekly-report",
  {
    schema: {
      querystring: schemas.weeklyReportQuery,
    },
  },
  async (req) => {
    let childId = pickChildId(req.query.childId);
    if (!childId && req.query.parentId) {
      const child = [...db.children.values()].find((x) => x.parentId === req.query.parentId);
      childId = child?.childId ?? null;
    }
    const report = weeklyReportForChild(childId);
    return {
      requestId: req.requestContext.requestId,
      ...report,
    };
  },
);

try {
  await app.listen({
    host: HOST,
    port: PORT,
  });
  app.log.info(`Fastify server listening on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
