import Fastify from "fastify";
import cors from "@fastify/cors";
import { analyzeContentInput } from "./content-analysis.mjs";
import {
  buildCardsForLesson,
  getLessonPack,
  getQuestionById,
  hasLessonPack,
  isGeneratedDynamicLesson,
  listCatalogGrades,
  listCatalogLessons,
  listCatalogTextbookVersions,
} from "./content-domain.mjs";
import {
  buildReviewQueueForChild,
  evaluateReviewAnswer,
  findReviewItemById,
  isSelectedIndexValid,
  toPublicReviewItem,
} from "./review-domain.mjs";

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

function childExists(childId) {
  return Boolean(childId && db.children.has(childId));
}

const db = {
  parents: new Map(),
  consents: new Map(),
  children: new Map(),
  parentSettings: new Map(),
  sessions: new Map(),
  activeSessionByChild: new Map(),
  reviewDoneByChild: new Map(),
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
  const childAttempts = db.attempts.filter((x) => x.childId === childId);
  const doneSet = db.reviewDoneByChild.get(childId) ?? new Set();
  return buildReviewQueueForChild({
    attempts: childAttempts,
    doneSet,
  });
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

function reviewQueueItemById(childId, reviewId) {
  return findReviewItemById(reviewQueueForChild(childId), reviewId);
}

function sessionHasQuestion(session, questionId) {
  return session.cards.some(
    (card) => card.type === "quiz" && card.payload?.questionId === questionId,
  );
}

function resolveSessionQuestion(session, questionId) {
  const globalQuestion = getQuestionById(questionId);
  if (globalQuestion) {
    return globalQuestion;
  }

  const quizCard = session.cards.find(
    (card) => card.type === "quiz" && card.payload?.questionId === questionId,
  );
  if (!quizCard) {
    return null;
  }

  return {
    correctIndex: quizCard.payload.correctIndex ?? 0,
    skillTag: quizCard.skillTag,
    errorTag: quizCard.skillTag === "main_idea" ? "main_idea_off" : "evidence_missed",
    evidenceText: quizCard.payload.evidenceText ?? "",
    whyWrong: quizCard.payload.whyWrong ?? "先回看上一张卡，再试一次。",
    retryQuestion: quizCard.payload.retryQuestion ?? "再选一个更合适的答案。",
  };
}

export function createApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(cors, {
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
      contentInputId: { type: "string" },
      generationContext: {
        type: "object",
        additionalProperties: true,
        properties: {
          contentInputId: { type: "string" },
          sourceTitle: { type: "string" },
          sourceSummary: { type: "string" },
          contentType: { type: "string" },
          recognizedFocus: { type: "string" },
          recognizedGradeLabel: { type: "string" },
          recognizedTextSnippet: { type: "string" },
          matchedLessonTitle: { type: "string" },
          routeKind: { type: "string" },
          routeLabel: { type: "string" },
          primaryChallenge: { type: "string" },
          recommendedEntryStep: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
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
  reviewAnswerBody: {
    type: "object",
    required: ["childId", "reviewId", "selectedIndex"],
    additionalProperties: false,
    properties: {
      childId: { type: "string", minLength: 1 },
      reviewId: { type: "string", minLength: 1 },
      selectedIndex: { type: "integer", minimum: 0 },
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
  contentAnalyzeBody: {
    type: "object",
    required: ["source", "gradeLabel", "focusLabel"],
    additionalProperties: false,
    properties: {
      source: { type: "string", enum: ["camera", "upload"] },
      fileName: { type: "string" },
      mimeType: { type: "string" },
      fileSize: { type: "number", minimum: 0 },
      preferredContentType: { type: "string", enum: ["textbook", "worksheet", "photo", "pdf"] },
      gradeLabel: { type: "string", minLength: 1 },
      focusLabel: { type: "string", minLength: 1 },
      readingLevel: { type: "string" },
      assetBase64: { type: "string" },
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
  "/content/analyze",
  {
    schema: {
      body: schemas.contentAnalyzeBody,
    },
  },
  async (req) => {
    const result = await analyzeContentInput(req.body ?? {});
    return {
      requestId: req.requestContext.requestId,
      ...result,
    };
  },
);

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
    db.reviewDoneByChild.delete(childId);
    db.attempts = db.attempts.filter((item) => item.childId !== childId);
    db.recitations = db.recitations.filter((item) => item.childId !== childId);

    const activeSessionId = db.activeSessionByChild.get(childId);
    if (activeSessionId) {
      db.sessions.delete(activeSessionId);
      db.activeSessionByChild.delete(childId);
    }
    for (const [sessionId, session] of db.sessions.entries()) {
      if (session.childId === childId) {
        db.sessions.delete(sessionId);
      }
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
    grades: listCatalogGrades(),
    textbookVersions: listCatalogTextbookVersions(),
    lessons: listCatalogLessons(),
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
    const lessonPack = getLessonPack(lessonId);
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
    const { childId, lessonId, forceNew, generationContext } = req.body ?? {};
    if (!db.children.has(childId)) {
      return fail(req, reply, 404, "CHILD_NOT_FOUND", "Child not found");
    }
    if (!hasLessonPack(lessonId) && !isGeneratedDynamicLesson(lessonId)) {
      return fail(req, reply, 404, "LESSON_NOT_FOUND", "Lesson not found");
    }
    if (isGeneratedDynamicLesson(lessonId) && !generationContext?.sourceTitle) {
      return fail(req, reply, 400, "GENERATION_CONTEXT_REQUIRED", "Generation context is required");
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
    const cards = buildCardsForLesson(lessonId, generationContext);
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
    const session = db.sessions.get(sessionId);
    if (!sessionHasQuestion(session, questionId)) {
      return fail(req, reply, 404, "QUESTION_NOT_FOUND", "Question not found");
    }
    const question = resolveSessionQuestion(session, questionId);
    if (!question) {
      return fail(req, reply, 404, "QUESTION_NOT_FOUND", "Question not found");
    }
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
  async (req, reply) => {
    const { childId, lessonId, segmentId, durationSec } = req.body ?? {};
    if (!db.children.has(childId)) {
      return fail(req, reply, 404, "CHILD_NOT_FOUND", "Child not found");
    }
    if (!hasLessonPack(lessonId)) {
      return fail(req, reply, 404, "LESSON_NOT_FOUND", "Lesson not found");
    }
    db.recitations.push({
      recitationId: id("rec"),
      childId,
      lessonId,
      segmentId: segmentId ?? "seg_1",
      durationSec: durationSec ?? 0,
      createdAt: nowIso(),
    });
    const recordedSegmentId = segmentId ?? "seg_1";
    const completedAt = nowIso();
    return {
      requestId: req.requestContext.requestId,
      status: "recorded",
      segmentId: recordedSegmentId,
      completedAt,
      message: "本段朗读已记录，继续保持。",
    };
  },
);

app.post(
  "/review/answer",
  {
    schema: {
      body: schemas.reviewAnswerBody,
    },
  },
  async (req, reply) => {
    const { childId, reviewId, selectedIndex } = req.body ?? {};
    if (!db.children.has(childId)) {
      return fail(req, reply, 404, "CHILD_NOT_FOUND", "Child not found");
    }
    const reviewItem = reviewQueueItemById(childId, reviewId);
    if (!reviewItem) {
      return fail(req, reply, 404, "REVIEW_ITEM_NOT_FOUND", "Review item not found");
    }
    if (!isSelectedIndexValid(reviewItem, selectedIndex)) {
      return fail(
        req,
        reply,
        400,
        "REVIEW_OPTION_OUT_OF_RANGE",
        "Selected option index out of range",
      );
    }

    const doneSet = db.reviewDoneByChild.get(childId) ?? new Set();
    const wasDone = doneSet.has(reviewId);
    const result = evaluateReviewAnswer(reviewItem, selectedIndex, wasDone);
    if (result.correct) {
      doneSet.add(reviewId);
      db.reviewDoneByChild.set(childId, doneSet);
    }

    return {
      requestId: req.requestContext.requestId,
      reviewId,
      ...result,
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
  async (req, reply) => {
    const requestedChildId = req.query.childId;
    if (requestedChildId && !childExists(requestedChildId)) {
      return fail(req, reply, 404, "CHILD_NOT_FOUND", "Child not found");
    }
    const childId = requestedChildId ?? pickChildId(null);
    if (!childId) {
      return fail(req, reply, 404, "CHILD_NOT_FOUND", "Child not found");
    }
    return {
      requestId: req.requestContext.requestId,
      items: reviewQueueForChild(childId).map(toPublicReviewItem),
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
  async (req, reply) => {
    const requestedChildId = req.query.childId;
    if (requestedChildId && !childExists(requestedChildId)) {
      return fail(req, reply, 404, "CHILD_NOT_FOUND", "Child not found");
    }
    const childId = requestedChildId ?? pickChildId(null);
    if (!childId) {
      return fail(req, reply, 404, "CHILD_NOT_FOUND", "Child not found");
    }
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
  async (req, reply) => {
    const requestedParentId = req.query.parentId;
    const requestedChildId = req.query.childId;

    if (requestedParentId && !db.parents.has(requestedParentId)) {
      return fail(req, reply, 404, "PARENT_NOT_FOUND", "Parent not found");
    }
    if (requestedChildId && !childExists(requestedChildId)) {
      return fail(req, reply, 404, "CHILD_NOT_FOUND", "Child not found");
    }

    let childId = requestedChildId ?? null;
    if (!childId && requestedParentId) {
      const child = [...db.children.values()].find((x) => x.parentId === requestedParentId);
      childId = child?.childId ?? null;
    }
    if (!childId) {
      childId = pickChildId(null);
    }
    if (!childId) {
      return fail(req, reply, 404, "CHILD_NOT_FOUND", "Child not found");
    }

    if (requestedParentId) {
      const child = db.children.get(childId);
      if (child?.parentId !== requestedParentId) {
        return fail(
          req,
          reply,
          409,
          "PARENT_CHILD_MISMATCH",
          "Parent does not own this child profile",
        );
      }
    }

    const report = weeklyReportForChild(childId);
    return {
      requestId: req.requestContext.requestId,
      ...report,
    };
  },
);

  return app;
}
