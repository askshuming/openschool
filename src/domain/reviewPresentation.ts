import { ReviewQueueItem } from "../api/contracts";

const typeLabelMap: Record<ReviewQueueItem["targetType"], string> = {
  vocab: "字词",
  evidence_locating: "证据句",
  main_idea: "主旨",
  recitation: "背诵",
};

const difficultyLabelMap: Record<ReviewQueueItem["difficulty"], string> = {
  basic: "基础",
  medium: "巩固",
  advanced: "提升",
};

const dueTextMap: Record<ReviewQueueItem["dueAt"], string> = {
  today: "今天",
  tomorrow: "明天",
  "3d": "3 天后",
  "7d": "7 天后",
};

export function getReviewTypeLabel(targetType: ReviewQueueItem["targetType"]) {
  return typeLabelMap[targetType];
}

export function getReviewDifficultyLabel(difficulty: ReviewQueueItem["difficulty"]) {
  return difficultyLabelMap[difficulty];
}

export function getReviewDueText(dueAt: ReviewQueueItem["dueAt"]) {
  return dueTextMap[dueAt];
}

const coachTitleMap: Record<ReviewQueueItem["targetType"], string> = {
  vocab: "先把这个字词稳住",
  evidence_locating: "先把依据句找准",
  main_idea: "先把主旨收清楚",
  recitation: "先把这一段读顺",
};

const coachHintMap: Record<ReviewQueueItem["targetType"], string> = {
  vocab: "先想清楚字词意思，再选答案。",
  evidence_locating: "先回想原文里的依据，再作答。",
  main_idea: "先想这段主要在讲什么，再选答案。",
  recitation: "先回忆读法和停顿，再开口读。",
};

const completionTitleMap: Record<ReviewQueueItem["targetType"], string> = {
  vocab: "这个字词已经稳住了",
  evidence_locating: "这句依据已经找到了",
  main_idea: "这一步主旨已经抓住了",
  recitation: "这一段已经读顺了",
};

export function getReviewCoachTitle(targetType: ReviewQueueItem["targetType"]) {
  return coachTitleMap[targetType];
}

export function getReviewCoachHint(targetType: ReviewQueueItem["targetType"]) {
  return coachHintMap[targetType];
}

export function getReviewCompletionTitle(targetType: ReviewQueueItem["targetType"]) {
  return completionTitleMap[targetType];
}
