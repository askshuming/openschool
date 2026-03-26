import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReviewQueueForChild,
  evaluateReviewAnswer,
  findReviewItemById,
  isSelectedIndexValid,
  toPublicReviewItem,
} from "../review-domain.mjs";

test("buildReviewQueueForChild includes retry item and applies done status", () => {
  const queue = buildReviewQueueForChild({
    attempts: [{ childId: "child_1", errorTag: "evidence_missed" }],
    doneSet: new Set(["r1"]),
  });

  assert.equal(queue[0].id, "retry_evidence_locating");
  const doneItem = queue.find((item) => item.id === "r1");
  assert.equal(doneItem?.status, "done");
});

test("buildReviewQueueForChild deduplicates retry items by errorTag", () => {
  const queue = buildReviewQueueForChild({
    attempts: [
      { childId: "child_1", errorTag: "evidence_missed" },
      { childId: "child_1", errorTag: "evidence_missed" },
      { childId: "child_1", errorTag: "unknown_tag" },
    ],
    doneSet: new Set(),
  });

  const retryItems = queue.filter((item) => item.id === "retry_evidence_locating");
  assert.equal(retryItems.length, 1);
});

test("toPublicReviewItem strips answer field", () => {
  const queue = buildReviewQueueForChild({
    attempts: [],
    doneSet: new Set(),
  });
  const r1 = queue.find((item) => item.id === "r1");
  const publicItem = toPublicReviewItem(r1);

  assert.equal(Object.prototype.hasOwnProperty.call(publicItem, "answer"), false);
  assert.ok(publicItem.practice?.options?.length > 0);
});

test("evaluateReviewAnswer returns status and feedback by correctness", () => {
  const queue = buildReviewQueueForChild({
    attempts: [],
    doneSet: new Set(),
  });
  const r2 = findReviewItemById(queue, "r2");

  assert.equal(isSelectedIndexValid(r2, -1), false);
  assert.equal(isSelectedIndexValid(r2, 1), true);

  const wrong = evaluateReviewAnswer(r2, 0, false);
  assert.equal(wrong.correct, false);
  assert.equal(wrong.status, "pending");
  assert.ok(wrong.feedback?.message);

  const correct = evaluateReviewAnswer(r2, 1, false);
  assert.equal(correct.correct, true);
  assert.equal(correct.status, "done");
  assert.equal(correct.nextDueAt, "7d");
});
