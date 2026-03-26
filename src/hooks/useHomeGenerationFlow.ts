import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { trackEvent } from "../analytics/tracker";
import { analyzeContentApi } from "../api/service";
import { motion } from "../design/tokens";
import { ContentInputRecord, InputSource, createContentInputRecord } from "../state/contentInputStore";
import { toUserErrorMessage } from "../utils/errorMessage";
import { triggerFeedback } from "../utils/feedback";

const GENERATED_DYNAMIC_LESSON_ID = "generated_dynamic";

interface GenerateAssetMeta {
  name?: string | null;
  uri?: string | null;
  mimeType?: string | null;
  size?: number;
  width?: number;
  height?: number;
  base64?: string | null;
}

interface HomeFlowNotice {
  id: string;
  title: string;
  body: string;
  tone: "success" | "primary";
}

interface GeneratedJourneySnapshot {
  id: string;
  title: string;
  source: InputSource;
  contentType: ContentInputRecord["contentType"];
  routeLabel: string;
  recommendedEntryStep: string;
  generatedTaskCount: number;
  lessonId: string | null;
  createdAt: string;
}

interface UseHomeGenerationFlowArgs {
  launchLessonId: string | null;
  recentInputCount: number;
  focusLabel: string;
  gradeLabel: string;
  readingLevel?: string;
  addInput: (record: ContentInputRecord) => void;
  recordGeneratedInput: (snapshot: GeneratedJourneySnapshot) => void;
  onNotice: (notice: HomeFlowNotice) => void;
  onNavigateToSession: (params: {
    lessonId: string;
    generationSource: InputSource;
    contentInputId: string;
  }) => void;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.onloadend = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("文件读取失败"));
        return;
      }
      const [, base64 = ""] = reader.result.split(",");
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

async function readAssetBase64(asset?: GenerateAssetMeta) {
  if (!asset) {
    return undefined;
  }
  if (asset.base64) {
    return asset.base64;
  }
  if (!asset.uri) {
    return undefined;
  }

  const response = await fetch(asset.uri);
  const blob = await response.blob();
  return blobToBase64(blob);
}

export function useHomeGenerationFlow({
  launchLessonId,
  recentInputCount,
  focusLabel,
  gradeLabel,
  readingLevel,
  addInput,
  recordGeneratedInput,
  onNotice,
  onNavigateToSession,
}: UseHomeGenerationFlowArgs) {
  const generationOverlayAnim = useRef(new Animated.Value(0)).current;
  const generationTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [generatingSource, setGeneratingSource] = useState<InputSource | null>(null);
  const [pendingGeneratedInput, setPendingGeneratedInput] = useState<ContentInputRecord | null>(null);

  const clearGenerationTimers = useCallback(() => {
    generationTimersRef.current.forEach((timer) => clearTimeout(timer));
    generationTimersRef.current = [];
  }, []);

  useEffect(() => () => clearGenerationTimers(), [clearGenerationTimers]);

  useEffect(() => {
    if (!generatingSource) {
      generationOverlayAnim.setValue(0);
      return;
    }

    generationOverlayAnim.setValue(0);
    Animated.timing(generationOverlayAnim, {
      toValue: 1,
      duration: motion.normal,
      useNativeDriver: true,
    }).start();
  }, [generationOverlayAnim, generatingSource]);

  const showNotice = useCallback(
    (idPrefix: string, title: string, body: string, tone: HomeFlowNotice["tone"]) => {
      onNotice({
        id: `${idPrefix}-${Date.now()}`,
        title,
        body,
        tone,
      });
    },
    [onNotice],
  );

  const queueGeneratedLesson = useCallback(
    (nextInput: ContentInputRecord, source: InputSource, lessonId: string) => {
      recordGeneratedInput({
        id: nextInput.id,
        title: nextInput.title,
        source: nextInput.source,
        contentType: nextInput.contentType,
        routeLabel: nextInput.routeLabel,
        recommendedEntryStep: nextInput.recommendedEntryStep,
        generatedTaskCount: nextInput.generatedTaskCount,
        lessonId: nextInput.lessonId,
        createdAt: nextInput.createdAt,
      });
      clearGenerationTimers();
      setPendingGeneratedInput(nextInput);
      generationTimersRef.current = [
        setTimeout(() => {
          setGeneratingSource(null);
          setPendingGeneratedInput(null);
          onNavigateToSession({
            lessonId,
            generationSource: source,
            contentInputId: nextInput.id,
          });
        }, 1400),
      ];
    },
    [clearGenerationTimers, onNavigateToSession, recordGeneratedInput],
  );

  const startGenerateFlow = useCallback(
    async (source: InputSource, asset?: GenerateAssetMeta) => {
      if (generatingSource) {
        return;
      }
      if (!launchLessonId) {
        showNotice("empty", "学习内容还没准备好", "请稍后再试。", "primary");
        return;
      }

      trackEvent("home_start_tap", {
        lessonId: launchLessonId,
        source: source === "camera" ? "home_camera_generate" : "home_upload_generate",
      });

      const provisionalInput = createContentInputRecord({
        source,
        countSeed: recentInputCount,
        focusLabel,
        gradeLabel,
        lessonId: launchLessonId,
        asset,
      });

      clearGenerationTimers();
      setGeneratingSource(source);
      setPendingGeneratedInput(provisionalInput);
      triggerFeedback("success");

      try {
        let assetBase64: string | undefined;
        try {
          assetBase64 = await readAssetBase64(asset);
        } catch {
          assetBase64 = undefined;
        }

        const analysis = await analyzeContentApi({
          source,
          fileName: asset?.name ?? undefined,
          mimeType: asset?.mimeType ?? undefined,
          fileSize: asset?.size,
          gradeLabel,
          focusLabel,
          readingLevel,
          assetBase64,
        });

        const nextInput = createContentInputRecord({
          source,
          countSeed: recentInputCount,
          focusLabel,
          gradeLabel,
          lessonId: analysis.recommendedLessonId ?? GENERATED_DYNAMIC_LESSON_ID,
          asset,
          analysis: {
            ...analysis,
            recommendedLessonId: analysis.recommendedLessonId ?? GENERATED_DYNAMIC_LESSON_ID,
          },
        });

        addInput(nextInput);
        queueGeneratedLesson(nextInput, source, nextInput.lessonId ?? GENERATED_DYNAMIC_LESSON_ID);
      } catch (error) {
        addInput(provisionalInput);
        queueGeneratedLesson(provisionalInput, source, provisionalInput.lessonId ?? launchLessonId);
        showNotice(
          "content-analyze-fallback",
          "这一页已经收到",
          toUserErrorMessage(error, "完整识别暂时不可用，已先安排学习内容。"),
          "primary",
        );
      }
    },
    [
      addInput,
      clearGenerationTimers,
      focusLabel,
      generatingSource,
      gradeLabel,
      launchLessonId,
      queueGeneratedLesson,
      readingLevel,
      recentInputCount,
      showNotice,
    ],
  );

  const pickCameraAsset = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showNotice("camera-permission", "需要相机权限", "允许相机权限后，才能拍照开始学习。", "primary");
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.84,
      allowsEditing: false,
      base64: true,
    });
    if (result.canceled || !result.assets?.length) {
      return null;
    }

    const asset = result.assets[0];
    return {
      name: asset.fileName,
      uri: asset.uri,
      mimeType: asset.mimeType,
      size: asset.fileSize,
      width: asset.width,
      height: asset.height,
      base64: asset.base64,
    } satisfies GenerateAssetMeta;
  }, [showNotice]);

  const handleCameraStart = useCallback(async () => {
    if (generatingSource) {
      return;
    }

    try {
      const asset = await pickCameraAsset();
      if (!asset) {
        return;
      }
      void startGenerateFlow("camera", asset);
    } catch (error) {
      showNotice("camera-error", "暂时无法打开相机", toUserErrorMessage(error, "请稍后重试。"), "primary");
    }
  }, [generatingSource, pickCameraAsset, showNotice, startGenerateFlow]);

  return {
    generationOverlayAnim,
    generatingSource,
    activeGeneratedInput: pendingGeneratedInput,
    handleCameraStart,
  };
}
