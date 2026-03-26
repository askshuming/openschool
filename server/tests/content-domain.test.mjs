import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCardsForLesson,
  getLessonPack,
  getQuestionById,
  hasLessonPack,
  listCatalogGrades,
  listCatalogLessons,
  listCatalogTextbookVersions,
} from "../content-domain.mjs";

test("content-domain exposes configured lesson and question", () => {
  assert.equal(hasLessonPack("g4_u1_l03"), true);
  assert.equal(hasLessonPack("not_exists"), false);

  const lesson = getLessonPack("g4_u1_l03");
  assert.equal(lesson?.id, "g4_u1_l03");

  const question = getQuestionById("q_evidence_1");
  assert.equal(question?.correctIndex, 1);
});

test("content-domain returns defensive copies", () => {
  const lessonA = getLessonPack("g4_u1_l03");
  lessonA.title = "mutated";
  const lessonB = getLessonPack("g4_u1_l03");
  assert.equal(lessonB.title, "观潮");

  const cardsA = buildCardsForLesson("g4_u1_l03");
  cardsA[0].payload.title = "mutated";
  const cardsB = buildCardsForLesson("g4_u1_l03");
  assert.equal(cardsB[0].payload.title, "导学卡");
});

test("catalog lessons are generated from lesson packs", () => {
  const lessons = listCatalogLessons();
  const lesson03 = lessons.find((item) => item.id === "g4_u1_l03");
  const lesson04 = lessons.find((item) => item.id === "g4_u1_l04");

  assert.ok(lesson03);
  assert.equal(lesson03.title, "观潮");
  assert.equal(lesson03.unitId, "u1");
  assert.equal(lesson03.focusSkillTag, "evidence_locating");
  assert.ok(lesson03.parentSuggestion.length > 0);
  assert.ok(lesson04);
  assert.equal(lesson04.title, "走月亮");
  assert.equal(lesson04.unitId, "u1");
  assert.equal(lesson04.focusSkillTag, "main_idea");
  assert.ok(lesson04.parentSuggestion.length > 0);
});

test("catalog grades and textbookVersions are generated from lesson packs", () => {
  const grades = listCatalogGrades();
  const versions = listCatalogTextbookVersions();

  assert.deepEqual(grades, ["G4"]);
  assert.deepEqual(versions, ["PEP"]);
});

test("lesson cards include recitation card with segment payload", () => {
  const lesson03Cards = buildCardsForLesson("g4_u1_l03");
  const lesson04Cards = buildCardsForLesson("g4_u1_l04");
  const lesson03Recitation = lesson03Cards.find((card) => card.type === "recitation");
  const lesson04Recitation = lesson04Cards.find((card) => card.type === "recitation");

  assert.ok(lesson03Recitation);
  assert.equal(lesson03Recitation.payload.segmentId, "l03_seg_1");
  assert.ok(lesson03Recitation.payload.recitationText);

  assert.ok(lesson04Recitation);
  assert.equal(lesson04Recitation.payload.segmentId, "l04_seg_1");
  assert.ok(lesson04Recitation.payload.recitationText);
});
