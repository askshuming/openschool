import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../create-app.mjs";

async function bootstrapChild(app) {
  const signupRes = await app.inject({
    method: "POST",
    url: "/parent/signup",
    payload: {
      account: `138${Date.now().toString().slice(-8)}`,
      code: "123456",
    },
  });
  assert.equal(signupRes.statusCode, 200);
  const signupJson = signupRes.json();
  const parentId = signupJson.parentId;

  const consentRes = await app.inject({
    method: "POST",
    url: "/consent/guardian",
    payload: {
      parentId,
      relation: "mother",
      childUnder14: true,
      agreed: true,
    },
  });
  assert.equal(consentRes.statusCode, 200);

  const childRes = await app.inject({
    method: "POST",
    url: "/child-profile",
    payload: {
      parentId,
      nickname: "小明",
      grade: "G4",
      textbookVersion: "PEP",
      interests: ["生活"],
      readingLevel: "normal",
    },
  });
  assert.equal(childRes.statusCode, 200);
  const childJson = childRes.json();
  return { parentId, childId: childJson.childId };
}

test("health endpoint returns ok", async () => {
  const app = createApp();
  const res = await app.inject({
    method: "GET",
    url: "/health",
  });
  assert.equal(res.statusCode, 200);
  const json = res.json();
  assert.equal(json.ok, true);
  assert.ok(json.requestId);
  await app.close();
});

test("catalog endpoint returns content-driven metadata", async () => {
  const app = createApp();
  const res = await app.inject({
    method: "GET",
    url: "/catalog",
  });

  assert.equal(res.statusCode, 200);
  const json = res.json();
  assert.deepEqual(json.grades, ["G4"]);
  assert.deepEqual(json.textbookVersions, ["PEP"]);
  assert.ok(Array.isArray(json.lessons));
  assert.ok(json.lessons.some((lesson) => lesson.id === "g4_u1_l03"));
  assert.ok(json.lessons.some((lesson) => lesson.id === "g4_u1_l04"));
  const lesson03 = json.lessons.find((lesson) => lesson.id === "g4_u1_l03");
  assert.equal(lesson03.focusSkillTag, "evidence_locating");
  assert.ok(lesson03.parentSuggestion);

  await app.close();
});

test("content analyze endpoint returns lesson-aware understanding result", async () => {
  const app = createApp();
  const textPayload = Buffer.from("钱塘江大潮，自古以来被称为天下奇观。", "utf8").toString("base64");

  const res = await app.inject({
    method: "POST",
    url: "/content/analyze",
    payload: {
      source: "upload",
      fileName: "观潮练习.txt",
      mimeType: "text/plain",
      gradeLabel: "四年级",
      focusLabel: "阅读",
      assetBase64: textPayload,
    },
  });

  assert.equal(res.statusCode, 200);
  const json = res.json();
  assert.equal(json.contentType, "worksheet");
  assert.equal(json.matchedLessonTitle, "观潮");
  assert.equal(json.recommendedLessonId, "g4_u1_l03");
  assert.equal(json.analysisMethod, "text_decode");
  assert.equal(json.routeKind, "reading_quiz");
  assert.equal(json.routeLabel, "阅读题突破路线");
  assert.equal(json.recommendedEntryStep, "先圈题干关键词");
  assert.ok(json.summary.includes("观潮"));
  assert.ok(Array.isArray(json.tags));
  assert.ok(json.tags.includes("已识别原文"));

  await app.close();
});

test("dynamic generated session works without fixed lesson pack", async () => {
  const app = createApp();
  const { childId } = await bootstrapChild(app);

  const startRes = await app.inject({
    method: "POST",
    url: "/session/start",
    payload: {
      childId,
      lessonId: "generated_dynamic",
      generationContext: {
        sourceTitle: "拍照练习页",
        sourceSummary: "这一页主要在练习概括段意，再进入短练习。",
        contentType: "worksheet",
        recognizedFocus: "阅读",
        recognizedGradeLabel: "四年级",
        recognizedTextSnippet: "先概括这段话主要写了什么。",
        tags: ["阅读", "主旨概括"],
      },
    },
  });

  assert.equal(startRes.statusCode, 200);
  const startJson = startRes.json();
  assert.equal(startJson.lessonId, "generated_dynamic");
  assert.ok(startJson.cards.some((card) => card.id === "dyn_quiz"));

  const answerRes = await app.inject({
    method: "POST",
    url: "/session/answer",
    payload: {
      sessionId: startJson.sessionId,
      questionId: "dynamic_q_1",
      selectedIndex: 1,
    },
  });

  assert.equal(answerRes.statusCode, 200);
  assert.equal(answerRes.json().correct, true);

  await app.close();
});

test("session lifecycle works: start -> answer -> finish", async () => {
  const app = createApp();
  const { childId } = await bootstrapChild(app);

  const startRes = await app.inject({
    method: "POST",
    url: "/session/start",
    payload: {
      childId,
      lessonId: "g4_u1_l03",
    },
  });
  assert.equal(startRes.statusCode, 200);
  const startJson = startRes.json();
  assert.ok(startJson.sessionId);
  assert.ok(Array.isArray(startJson.cards));
  assert.ok(startJson.cards.length > 0);

  const answerRes = await app.inject({
    method: "POST",
    url: "/session/answer",
    payload: {
      sessionId: startJson.sessionId,
      questionId: "q_evidence_1",
      selectedIndex: 1,
    },
  });
  assert.equal(answerRes.statusCode, 200);
  const answerJson = answerRes.json();
  assert.equal(answerJson.correct, true);

  const finishRes = await app.inject({
    method: "POST",
    url: "/session/finish",
    payload: {
      sessionId: startJson.sessionId,
      completed: true,
    },
  });
  assert.equal(finishRes.statusCode, 200);
  const finishJson = finishRes.json();
  assert.equal(finishJson.status, "finished");

  const startAfterFinishRes = await app.inject({
    method: "POST",
    url: "/session/start",
    payload: {
      childId,
      lessonId: "g4_u1_l03",
    },
  });
  assert.equal(startAfterFinishRes.statusCode, 200);
  const restartJson = startAfterFinishRes.json();
  assert.notEqual(restartJson.sessionId, startJson.sessionId);

  await app.close();
});

test("session answer only accepts questions from current lesson session", async () => {
  const app = createApp();
  const { childId } = await bootstrapChild(app);

  const startRes = await app.inject({
    method: "POST",
    url: "/session/start",
    payload: {
      childId,
      lessonId: "g4_u1_l04",
    },
  });
  assert.equal(startRes.statusCode, 200);
  const startJson = startRes.json();

  const validAnswerRes = await app.inject({
    method: "POST",
    url: "/session/answer",
    payload: {
      sessionId: startJson.sessionId,
      questionId: "q_moonlight_1",
      selectedIndex: 2,
    },
  });
  assert.equal(validAnswerRes.statusCode, 200);
  assert.equal(validAnswerRes.json().correct, true);

  const mismatchAnswerRes = await app.inject({
    method: "POST",
    url: "/session/answer",
    payload: {
      sessionId: startJson.sessionId,
      questionId: "q_evidence_1",
      selectedIndex: 1,
    },
  });
  assert.equal(mismatchAnswerRes.statusCode, 404);
  assert.equal(mismatchAnswerRes.json().errorCode, "QUESTION_NOT_FOUND");

  await app.close();
});

test("session resume and forceNew behavior works", async () => {
  const app = createApp();
  const { childId } = await bootstrapChild(app);

  const firstStart = await app.inject({
    method: "POST",
    url: "/session/start",
    payload: {
      childId,
      lessonId: "g4_u1_l03",
      forceNew: false,
    },
  });
  const first = firstStart.json();

  const resumed = await app.inject({
    method: "POST",
    url: "/session/start",
    payload: {
      childId,
      lessonId: "g4_u1_l03",
      forceNew: false,
    },
  });
  const resumedJson = resumed.json();
  assert.equal(resumedJson.sessionId, first.sessionId);

  const forced = await app.inject({
    method: "POST",
    url: "/session/start",
    payload: {
      childId,
      lessonId: "g4_u1_l03",
      forceNew: true,
    },
  });
  const forcedJson = forced.json();
  assert.notEqual(forcedJson.sessionId, first.sessionId);

  await app.close();
});

test("session recitation records completion", async () => {
  const app = createApp();
  const { childId } = await bootstrapChild(app);

  const recitationRes = await app.inject({
    method: "POST",
    url: "/session/recitation",
    payload: {
      childId,
      lessonId: "g4_u1_l03",
      segmentId: "l03_seg_1",
      durationSec: 21,
    },
  });
  assert.equal(recitationRes.statusCode, 200);
  const recitationJson = recitationRes.json();
  assert.equal(recitationJson.status, "recorded");
  assert.equal(recitationJson.segmentId, "l03_seg_1");
  assert.ok(recitationJson.completedAt);
  assert.ok(recitationJson.message);

  const reportRes = await app.inject({
    method: "GET",
    url: `/parent/weekly-report?childId=${childId}`,
  });
  assert.equal(reportRes.statusCode, 200);
  const reportJson = reportRes.json();
  assert.equal(reportJson.recitation.completedCount, 1);
  assert.ok(Array.isArray(reportJson.recitation.unstableSegments));

  await app.close();
});

test("validation and business errors return errorCode", async () => {
  const app = createApp();

  const validationRes = await app.inject({
    method: "POST",
    url: "/parent/signup",
    payload: {},
  });
  assert.equal(validationRes.statusCode, 400);
  const validationJson = validationRes.json();
  assert.equal(validationJson.errorCode, "VALIDATION_ERROR");

  const parentNotFoundRes = await app.inject({
    method: "POST",
    url: "/consent/guardian",
    payload: {
      parentId: "parent_not_exist",
      relation: "mother",
      childUnder14: true,
      agreed: true,
    },
  });
  assert.equal(parentNotFoundRes.statusCode, 404);
  const parentNotFoundJson = parentNotFoundRes.json();
  assert.equal(parentNotFoundJson.errorCode, "PARENT_NOT_FOUND");

  const sessionNotFoundRes = await app.inject({
    method: "POST",
    url: "/session/finish",
    payload: {
      sessionId: "sess_not_exist",
      completed: true,
    },
  });
  assert.equal(sessionNotFoundRes.statusCode, 404);
  const sessionNotFoundJson = sessionNotFoundRes.json();
  assert.equal(sessionNotFoundJson.errorCode, "SESSION_NOT_FOUND");

  const reviewQueueRes = await app.inject({
    method: "GET",
    url: "/review-queue?childId=child_not_exist",
  });
  assert.equal(reviewQueueRes.statusCode, 404);
  const reviewQueueJson = reviewQueueRes.json();
  assert.equal(reviewQueueJson.errorCode, "CHILD_NOT_FOUND");

  const recitationRes = await app.inject({
    method: "POST",
    url: "/session/recitation",
    payload: {
      childId: "child_not_exist",
      lessonId: "g4_u1_l03",
    },
  });
  assert.equal(recitationRes.statusCode, 404);
  const recitationJson = recitationRes.json();
  assert.equal(recitationJson.errorCode, "CHILD_NOT_FOUND");

  const reviewAnswerRes = await app.inject({
    method: "POST",
    url: "/review/answer",
    payload: {
      childId: "child_not_exist",
      reviewId: "r1",
      selectedIndex: 1,
    },
  });
  assert.equal(reviewAnswerRes.statusCode, 404);
  const reviewAnswerJson = reviewAnswerRes.json();
  assert.equal(reviewAnswerJson.errorCode, "CHILD_NOT_FOUND");

  await app.close();
});

test("guardian consent record can be queried by parent", async () => {
  const app = createApp();

  const signupRes = await app.inject({
    method: "POST",
    url: "/parent/signup",
    payload: {
      account: `139${Date.now().toString().slice(-8)}`,
      code: "654321",
    },
  });
  assert.equal(signupRes.statusCode, 200);
  const parentId = signupRes.json().parentId;

  const noRecordRes = await app.inject({
    method: "GET",
    url: `/consent/record?parentId=${parentId}`,
  });
  assert.equal(noRecordRes.statusCode, 404);
  assert.equal(noRecordRes.json().errorCode, "CONSENT_NOT_FOUND");

  const consentRes = await app.inject({
    method: "POST",
    url: "/consent/guardian",
    payload: {
      parentId,
      relation: "mother",
      childUnder14: true,
      agreed: true,
    },
  });
  assert.equal(consentRes.statusCode, 200);

  const recordRes = await app.inject({
    method: "GET",
    url: `/consent/record?parentId=${parentId}`,
  });
  assert.equal(recordRes.statusCode, 200);
  const record = recordRes.json();
  assert.equal(record.parentId, parentId);
  assert.equal(record.relation, "mother");
  assert.equal(record.childUnder14, true);
  assert.equal(record.agreed, true);
  assert.ok(record.consentId);
  assert.ok(record.agreedAt);

  const revokeRes = await app.inject({
    method: "POST",
    url: "/consent/revoke",
    payload: {
      parentId,
    },
  });
  assert.equal(revokeRes.statusCode, 200);
  const revokeJson = revokeRes.json();
  assert.equal(revokeJson.parentId, parentId);
  assert.equal(revokeJson.status, "revoked");
  assert.ok(revokeJson.revokedAt);

  const recordAfterRevokeRes = await app.inject({
    method: "GET",
    url: `/consent/record?parentId=${parentId}`,
  });
  assert.equal(recordAfterRevokeRes.statusCode, 200);
  const recordAfterRevoke = recordAfterRevokeRes.json();
  assert.ok(recordAfterRevoke.revokedAt);

  const childAfterRevokeRes = await app.inject({
    method: "POST",
    url: "/child-profile",
    payload: {
      parentId,
      nickname: "小明",
      grade: "G4",
      textbookVersion: "PEP",
      interests: ["生活"],
      readingLevel: "normal",
    },
  });
  assert.equal(childAfterRevokeRes.statusCode, 409);
  assert.equal(childAfterRevokeRes.json().errorCode, "CONSENT_REQUIRED");

  await app.close();
});

test("weekly report validates parent-child ownership", async () => {
  const app = createApp();
  const { childId } = await bootstrapChild(app);

  const otherParentRes = await app.inject({
    method: "POST",
    url: "/parent/signup",
    payload: {
      account: `139${Date.now().toString().slice(-8)}`,
      code: "123456",
    },
  });
  assert.equal(otherParentRes.statusCode, 200);
  const otherParentId = otherParentRes.json().parentId;

  const reportRes = await app.inject({
    method: "GET",
    url: `/parent/weekly-report?childId=${childId}&parentId=${otherParentId}`,
  });
  assert.equal(reportRes.statusCode, 409);
  const reportJson = reportRes.json();
  assert.equal(reportJson.errorCode, "PARENT_CHILD_MISMATCH");

  await app.close();
});

test("parent settings can be queried and updated", async () => {
  const app = createApp();
  const { parentId } = await bootstrapChild(app);

  const initialRes = await app.inject({
    method: "GET",
    url: `/parent/settings?parentId=${parentId}`,
  });
  assert.equal(initialRes.statusCode, 200);
  const initialJson = initialRes.json();
  assert.equal(initialJson.parentId, parentId);
  assert.equal(initialJson.studyDurationLimitMin, 15);
  assert.equal(initialJson.reminderTime, "19:30");

  const updateRes = await app.inject({
    method: "POST",
    url: "/parent/settings",
    payload: {
      parentId,
      studyDurationLimitMin: 20,
      reminderTime: "20:00",
    },
  });
  assert.equal(updateRes.statusCode, 200);
  const updateJson = updateRes.json();
  assert.equal(updateJson.parentId, parentId);
  assert.equal(updateJson.studyDurationLimitMin, 20);
  assert.equal(updateJson.reminderTime, "20:00");
  assert.ok(updateJson.updatedAt);

  const afterRes = await app.inject({
    method: "GET",
    url: `/parent/settings?parentId=${parentId}`,
  });
  assert.equal(afterRes.statusCode, 200);
  const afterJson = afterRes.json();
  assert.equal(afterJson.studyDurationLimitMin, 20);
  assert.equal(afterJson.reminderTime, "20:00");

  const invalidTimeRes = await app.inject({
    method: "POST",
    url: "/parent/settings",
    payload: {
      parentId,
      studyDurationLimitMin: 20,
      reminderTime: "25:99",
    },
  });
  assert.equal(invalidTimeRes.statusCode, 400);
  assert.equal(invalidTimeRes.json().errorCode, "VALIDATION_ERROR");

  const parentNotFoundRes = await app.inject({
    method: "GET",
    url: "/parent/settings?parentId=parent_not_exist",
  });
  assert.equal(parentNotFoundRes.statusCode, 404);
  assert.equal(parentNotFoundRes.json().errorCode, "PARENT_NOT_FOUND");

  await app.close();
});

test("parent can export and delete child data", async () => {
  const app = createApp();
  const { parentId, childId } = await bootstrapChild(app);

  const startRes = await app.inject({
    method: "POST",
    url: "/session/start",
    payload: {
      childId,
      lessonId: "g4_u1_l03",
    },
  });
  assert.equal(startRes.statusCode, 200);
  const sessionId = startRes.json().sessionId;

  const answerRes = await app.inject({
    method: "POST",
    url: "/session/answer",
    payload: {
      sessionId,
      questionId: "q_evidence_1",
      selectedIndex: 1,
    },
  });
  assert.equal(answerRes.statusCode, 200);

  const recitationRes = await app.inject({
    method: "POST",
    url: "/session/recitation",
    payload: {
      childId,
      lessonId: "g4_u1_l03",
      segmentId: "l03_seg_1",
      durationSec: 16,
    },
  });
  assert.equal(recitationRes.statusCode, 200);

  const exportRes = await app.inject({
    method: "GET",
    url: `/parent/export-data?parentId=${parentId}&childId=${childId}`,
  });
  assert.equal(exportRes.statusCode, 200);
  const exportJson = exportRes.json();
  assert.equal(exportJson.parentId, parentId);
  assert.equal(exportJson.childId, childId);
  assert.ok(exportJson.exportedAt);
  assert.equal(exportJson.profile.nickname, "小明");
  assert.ok(exportJson.progressSummary);
  assert.ok(exportJson.weeklyReport);
  assert.equal(exportJson.attemptsCount, 1);
  assert.equal(exportJson.recitationsCount, 1);

  const deleteRes = await app.inject({
    method: "POST",
    url: "/child-profile/delete",
    payload: {
      parentId,
      childId,
    },
  });
  assert.equal(deleteRes.statusCode, 200);
  const deleteJson = deleteRes.json();
  assert.equal(deleteJson.childId, childId);
  assert.equal(deleteJson.status, "deleted");
  assert.ok(deleteJson.deletedAt);

  const exportAfterDeleteRes = await app.inject({
    method: "GET",
    url: `/parent/export-data?parentId=${parentId}&childId=${childId}`,
  });
  assert.equal(exportAfterDeleteRes.statusCode, 404);
  assert.equal(exportAfterDeleteRes.json().errorCode, "CHILD_NOT_FOUND");

  await app.close();
});

test("review answer updates review queue status", async () => {
  const app = createApp();
  const { childId } = await bootstrapChild(app);

  const beforeRes = await app.inject({
    method: "GET",
    url: `/review-queue?childId=${childId}`,
  });
  assert.equal(beforeRes.statusCode, 200);
  const beforeItems = beforeRes.json().items;
  const beforeR1 = beforeItems.find((item) => item.id === "r1");
  assert.equal(beforeR1?.status, "pending");
  assert.equal(Object.prototype.hasOwnProperty.call(beforeR1.practice, "correctIndex"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(beforeR1.practice, "feedback"), false);

  const answerRes = await app.inject({
    method: "POST",
    url: "/review/answer",
    payload: {
      childId,
      reviewId: "r1",
      selectedIndex: 1,
    },
  });
  assert.equal(answerRes.statusCode, 200);
  const answerJson = answerRes.json();
  assert.equal(answerJson.correct, true);
  assert.equal(answerJson.status, "done");
  assert.ok(answerJson.feedback?.message);

  const afterRes = await app.inject({
    method: "GET",
    url: `/review-queue?childId=${childId}`,
  });
  assert.equal(afterRes.statusCode, 200);
  const afterItems = afterRes.json().items;
  const afterR1 = afterItems.find((item) => item.id === "r1");
  assert.equal(afterR1?.status, "done");

  const wrongRes = await app.inject({
    method: "POST",
    url: "/review/answer",
    payload: {
      childId,
      reviewId: "r2",
      selectedIndex: 0,
    },
  });
  assert.equal(wrongRes.statusCode, 200);
  const wrongJson = wrongRes.json();
  assert.equal(wrongJson.correct, false);
  assert.equal(wrongJson.status, "pending");

  const invalidOptionRes = await app.inject({
    method: "POST",
    url: "/review/answer",
    payload: {
      childId,
      reviewId: "r2",
      selectedIndex: 999,
    },
  });
  assert.equal(invalidOptionRes.statusCode, 400);
  const invalidOptionJson = invalidOptionRes.json();
  assert.equal(invalidOptionJson.errorCode, "REVIEW_OPTION_OUT_OF_RANGE");

  await app.close();
});
