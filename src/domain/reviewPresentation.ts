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
