export type ReviewType = "字词" | "证据句" | "主旨" | "背诵";

export interface ReviewItem {
  id: string;
  title: string;
  type: ReviewType;
  dueText: string;
  level: "基础" | "巩固" | "提升";
}

export const todayLesson = {
  title: "观潮",
  subtitle: "统编版四上 · 第一单元",
  duration: "预计 10 分钟",
  streakDays: 6,
};

export const weeklyStats = {
  completedLessons: 4,
  masteredTags: ["字词理解", "证据句定位", "主旨概括"],
};

export const reviewItems: ReviewItem[] = [
  { id: "r1", title: "奇观（词义辨析）", type: "字词", dueText: "今天", level: "基础" },
  { id: "r2", title: "找出描写潮声的依据句", type: "证据句", dueText: "今天", level: "巩固" },
  { id: "r3", title: "《观潮》主旨一句话", type: "主旨", dueText: "明天", level: "巩固" },
  { id: "r4", title: "《古诗三首》背诵片段 2", type: "背诵", dueText: "3 天后", level: "提升" },
];
