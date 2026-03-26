import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ContentAnalyzeResponse, StudyRouteKind } from "../api/contracts";
import {
  buildStudyRouteSummary,
  estimateStudyRouteTaskCount,
  getStudyRouteMeta,
  inferStudyRouteKind,
} from "../domain/studyRoutes";

export type InputSource = "camera" | "upload";
export type InputContentType = "textbook" | "worksheet" | "photo" | "pdf";

export interface ContentInputRecord {
  id: string;
  source: InputSource;
  contentType: InputContentType;
  title: string;
  summary: string;
  routeKind: StudyRouteKind;
  routeLabel: string;
  primaryChallenge: string;
  recommendedEntryStep: string;
  recognizedFocus: string;
  recognizedGradeLabel: string;
  generatedTaskCount: number;
  createdAt: string;
  lessonId: string | null;
  textbookVersion?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  previewUri?: string | null;
  width?: number;
  height?: number;
  matchedLessonTitle?: string;
  analysisMethod?: ContentAnalyzeResponse["analysisMethod"];
  analysisConfidence?: ContentAnalyzeResponse["confidence"];
  recognizedTextSnippet?: string;
  recognizedTags?: string[];
}

type ContentInputAssetMeta = {
  name?: string | null;
  uri?: string | null;
  mimeType?: string | null;
  size?: number;
  width?: number;
  height?: number;
};

interface CreateContentInputRecordParams {
  source: InputSource;
  countSeed: number;
  focusLabel: string;
  gradeLabel: string;
  lessonId?: string | null;
  preferredContentType?: InputContentType;
  asset?: ContentInputAssetMeta;
  analysis?: Omit<ContentAnalyzeResponse, "requestId">;
}

interface ContentInputStoreState {
  hasHydrated: boolean;
  recentInputs: ContentInputRecord[];
  addInput: (record: ContentInputRecord) => void;
  clearInputs: () => void;
  setHasHydrated: (ready: boolean) => void;
}

const MAX_RECENT_INPUTS = 6;
const textbookKeywords = ["教材", "课文", "语文", "上册", "下册", "单元"];
const worksheetKeywords = ["练习", "试卷", "习题", "作业", "训练", "测试", "阅读"];
const photoKeywords = ["板书", "课堂", "笔记", "拍照", "截图"];

function recordId() {
  return `input_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function stripExtension(fileName?: string | null) {
  if (!fileName) {
    return "";
  }
  return fileName.replace(/\.[^.]+$/, "");
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function isGenericAssetName(name: string) {
  const normalized = name.trim().toLowerCase();
  return /^(img|image|photo|scan|document|screenshot|capture)[-_ ]?\d*$/.test(normalized);
}

function includesKeyword(fileName: string, keywords: string[]) {
  return keywords.some((keyword) => fileName.includes(keyword));
}

function inferContentType({
  source,
  preferredContentType,
  fileName,
  mimeType,
}: {
  source: InputSource;
  preferredContentType?: InputContentType;
  fileName: string;
  mimeType?: string | null;
}) {
  if (preferredContentType) {
    return preferredContentType;
  }
  const normalizedName = fileName.toLowerCase();
  if (mimeType === "application/pdf" || normalizedName.endsWith(".pdf")) {
    return "pdf" as const;
  }
  if (includesKeyword(fileName, textbookKeywords)) {
    return "textbook" as const;
  }
  if (includesKeyword(fileName, worksheetKeywords)) {
    return "worksheet" as const;
  }
  if (includesKeyword(fileName, photoKeywords)) {
    return "photo" as const;
  }
  return source === "camera" ? ("worksheet" as const) : ("photo" as const);
}

function buildDefaultTitle(contentType: InputContentType, gradeLabel: string) {
  switch (contentType) {
    case "textbook":
      return `${gradeLabel}语文教材页`;
    case "worksheet":
      return `${gradeLabel}阅读练习题`;
    case "photo":
      return `${gradeLabel}学习图片`;
    case "pdf":
      return `${gradeLabel}学习 PDF`;
    default:
      return `${gradeLabel}学习内容`;
  }
}

function buildInputTitle(
  contentType: InputContentType,
  gradeLabel: string,
  fileName?: string | null,
) {
  const baseName = stripExtension(fileName);
  if (baseName && !isGenericAssetName(baseName)) {
    return truncate(baseName, 18);
  }
  return buildDefaultTitle(contentType, gradeLabel);
}

function buildTextbookVersion(contentType: InputContentType, gradeLabel: string) {
  return contentType === "textbook" ? `部编版 ${gradeLabel} 语文` : undefined;
}

function buildPreviewUri({
  source,
  contentType,
  uri,
  mimeType,
}: {
  source: InputSource;
  contentType: InputContentType;
  uri?: string | null;
  mimeType?: string | null;
}) {
  if (!uri) {
    return null;
  }
  if (contentType === "pdf") {
    return null;
  }
  if (source === "camera") {
    return uri;
  }
  return mimeType?.startsWith("image/") ? uri : null;
}

export function createContentInputRecord({
  source,
  countSeed,
  focusLabel,
  gradeLabel,
  lessonId,
  preferredContentType,
  asset,
  analysis,
}: CreateContentInputRecordParams): ContentInputRecord {
  const fileName = asset?.name ?? undefined;
  const contentType = analysis?.contentType ?? inferContentType({
    source,
    preferredContentType,
    fileName: fileName ?? "",
    mimeType: asset?.mimeType,
  });
  const routeKind = analysis?.routeKind ?? inferStudyRouteKind({
    contentType,
    focusLabel,
    fileName: fileName ?? "",
  });
  const routeMeta = getStudyRouteMeta(routeKind);
  const generatedTaskCount =
    analysis?.generatedTaskCount ??
    estimateStudyRouteTaskCount({
      contentType,
      recognizedFocus: focusLabel,
      routeKind,
    });

  return {
    id: recordId(),
    source,
    contentType,
    title: analysis?.title ?? buildInputTitle(contentType, gradeLabel, fileName),
    summary: analysis?.summary ?? buildStudyRouteSummary(routeKind),
    routeKind,
    routeLabel: analysis?.routeLabel ?? routeMeta.routeLabel,
    primaryChallenge: analysis?.primaryChallenge ?? routeMeta.primaryChallenge,
    recommendedEntryStep: analysis?.recommendedEntryStep ?? routeMeta.recommendedEntryStep,
    recognizedFocus: analysis?.recognizedFocus ?? focusLabel,
    recognizedGradeLabel: analysis?.recognizedGradeLabel ?? gradeLabel,
    generatedTaskCount,
    createdAt: new Date().toISOString(),
    lessonId: analysis?.recommendedLessonId ?? lessonId ?? null,
    textbookVersion: analysis?.textbookVersion ?? buildTextbookVersion(contentType, gradeLabel),
    fileName,
    fileSize: asset?.size,
    mimeType: asset?.mimeType ?? undefined,
    previewUri: buildPreviewUri({
      source,
      contentType,
      uri: asset?.uri,
      mimeType: asset?.mimeType,
    }),
    width: asset?.width,
    height: asset?.height,
    matchedLessonTitle: analysis?.matchedLessonTitle,
    analysisMethod: analysis?.analysisMethod,
    analysisConfidence: analysis?.confidence,
    recognizedTextSnippet: analysis?.recognizedTextSnippet,
    recognizedTags: analysis?.tags,
  };
}

export function getContentTypeLabel(contentType: InputContentType) {
  switch (contentType) {
    case "textbook":
      return "教材";
    case "worksheet":
      return "练习题";
    case "photo":
      return "图片";
    case "pdf":
      return "PDF";
    default:
      return "内容";
  }
}

export function getInputSourceLabel(source: InputSource) {
  return source === "camera" ? "拍照输入" : "上传输入";
}

export function getRelativeInputTimeLabel(createdAt: string) {
  const deltaMs = Date.now() - new Date(createdAt).getTime();
  const deltaMinutes = Math.max(0, Math.floor(deltaMs / 60000));
  if (deltaMinutes < 1) {
    return "刚刚";
  }
  if (deltaMinutes < 60) {
    return `${deltaMinutes} 分钟前`;
  }
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours} 小时前`;
  }
  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays} 天前`;
}

export function getReadableFileSizeLabel(fileSize?: number) {
  if (!fileSize || fileSize <= 0) {
    return "";
  }
  if (fileSize < 1024 * 1024) {
    return `${Math.max(1, Math.round(fileSize / 1024))} KB`;
  }
  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

export function hasImagePreview(input: ContentInputRecord) {
  return Boolean(input.previewUri);
}

export const useContentInputStore = create<ContentInputStoreState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      recentInputs: [],
      addInput: (record) =>
        set((state) => ({
          recentInputs: [record, ...state.recentInputs].slice(0, MAX_RECENT_INPUTS),
        })),
      clearInputs: () => set({ recentInputs: [] }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "yuwen-content-inputs-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        recentInputs: state.recentInputs,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
