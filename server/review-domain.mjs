import { RETRY_ITEMS_BY_ERROR_TAG, REVIEW_ITEMS } from "./review-items.mjs";

function cloneReviewItem(item) {
  return JSON.parse(JSON.stringify(item));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateReviewItem(item, source) {
  assert(item && typeof item === "object", `${source}: item must be an object`);
  assert(typeof item.id === "string" && item.id.length > 0, `${source}: id is required`);
  assert(typeof item.targetType === "string" && item.targetType.length > 0, `${source}: targetType is required`);
  assert(typeof item.title === "string" && item.title.length > 0, `${source}: title is required`);

  const options = item.practice?.options;
  assert(Array.isArray(options) && options.length >= 2, `${source}: practice.options must contain at least 2 options`);

  const correctIndex = item.answer?.correctIndex;
  assert(Number.isInteger(correctIndex), `${source}: answer.correctIndex must be an integer`);
  assert(
    correctIndex >= 0 && correctIndex < options.length,
    `${source}: answer.correctIndex must be within options range`,
  );

  assert(
    typeof item.answer?.feedback?.correctMessage === "string" && item.answer.feedback.correctMessage.length > 0,
    `${source}: answer.feedback.correctMessage is required`,
  );
  assert(
    typeof item.answer?.feedback?.wrongMessage === "string" && item.answer.feedback.wrongMessage.length > 0,
    `${source}: answer.feedback.wrongMessage is required`,
  );
  assert(
    typeof item.answer?.feedback?.evidence === "string" && item.answer.feedback.evidence.length > 0,
    `${source}: answer.feedback.evidence is required`,
  );
}

function validateReviewConfig() {
  const seenIds = new Set();

  REVIEW_ITEMS.forEach((item, index) => {
    const source = `REVIEW_ITEMS[${index}]`;
    validateReviewItem(item, source);
    assert(!seenIds.has(item.id), `${source}: duplicate id \"${item.id}\"`);
    seenIds.add(item.id);
  });

  Object.entries(RETRY_ITEMS_BY_ERROR_TAG).forEach(([errorTag, item]) => {
    const source = `RETRY_ITEMS_BY_ERROR_TAG.${errorTag}`;
    validateReviewItem(item, source);
    assert(!seenIds.has(item.id), `${source}: id \"${item.id}\" conflicts with existing item`);
    seenIds.add(item.id);
  });
}

validateReviewConfig();

function baseReviewItems() {
  return REVIEW_ITEMS.map(cloneReviewItem);
}

function retryItemsForAttempts(attempts) {
  const triggeredTags = new Set(attempts.map((x) => x.errorTag).filter(Boolean));
  const retryItems = [];

  for (const errorTag of triggeredTags) {
    const retryItem = RETRY_ITEMS_BY_ERROR_TAG[errorTag];
    if (retryItem) {
      retryItems.push(cloneReviewItem(retryItem));
    }
  }

  return retryItems;
}

export function buildReviewQueueForChild({ attempts, doneSet }) {
  const items = [...retryItemsForAttempts(attempts), ...baseReviewItems()];
  return items.map((item) =>
    doneSet.has(item.id)
      ? {
          ...item,
          status: "done",
        }
      : item,
  );
}

export function toPublicReviewItem(item) {
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

export function findReviewItemById(items, reviewId) {
  return items.find((item) => item.id === reviewId) ?? null;
}

export function isSelectedIndexValid(reviewItem, selectedIndex) {
  return selectedIndex >= 0 && selectedIndex < reviewItem.practice.options.length;
}

export function evaluateReviewAnswer(reviewItem, selectedIndex, wasDone) {
  const correct = selectedIndex === reviewItem.answer.correctIndex;
  const status = reviewItem.status === "done" || wasDone || correct ? "done" : "pending";
  return {
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
