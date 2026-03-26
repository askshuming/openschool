import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionSheetIOS, Animated, Platform } from "react-native";
import { trackEvent } from "../analytics/tracker";
import { analyzeContentApi } from "../api/service";
import { motion } from "../design/tokens";
import {
  ContentInputRecord,
  InputContentType,
  InputSource,
  createContentInputRecord,
} from "../state/contentInputStore";
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

type PendingPickerKind = "camera" | "library" | "document";

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
  contentType: InputContentType;
  routeLabel: string;
  recommendedEntryStep: string;
  generatedTaskCount: number;
  lessonId: string | null;
  createdAt: string;
}

interface PendingInputSelection {
  source: InputSource;
  pickerKind: PendingPickerKind;
  preferredContentType?: InputContentType;
  asset: GenerateAssetMeta;
  previewInput: ContentInputRecord;
}

interface UseHomeGenerationFlowArgs {
  launchLessonId: string | null;
  latestInput: ContentInputRecord | null;
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
  latestInput,
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
  const [generationStepIndex, setGenerationStepIndex] = useState(0);
  const [pendingGeneratedInput, setPendingGeneratedInput] = useState<ContentInputRecord | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PendingInputSelection | null>(null);

  const activeGeneratedInput = pendingGeneratedInput ?? latestInput;

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

  const openSelectionPreview = useCallback(
    (
      source: InputSource,
      pickerKind: PendingPickerKind,
      preferredContentType: InputContentType | undefined,
      asset: GenerateAssetMeta,
    ) => {
      const previewInput = createContentInputRecord({
        source,
        countSeed: recentInputCount,
        focusLabel,
        gradeLabel,
        lessonId: launchLessonId,
        preferredContentType,
        asset,
      });
      setPendingSelection({
        source,
        pickerKind,
        preferredContentType,
        asset,
        previewInput,
      });
    },
    [focusLabel, gradeLabel, launchLessonId, recentInputCount],
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
      setGenerationStepIndex(1);
      generationTimersRef.current = [
        setTimeout(() => setGenerationStepIndex(2), 360),
        setTimeout(() => {
          setGeneratingSource(null);
          setGenerationStepIndex(0);
          setPendingGeneratedInput(null);
          onNavigateToSession({
            lessonId,
            generationSource: source,
            contentInputId: nextInput.id,
          });
        }, 1160),
      ];
    },
    [clearGenerationTimers, onNavigateToSession, recordGeneratedInput],
  );

  const canStartGenerateFlow = useCallback(() => {
    if (!launchLessonId) {
      showNotice(
        "empty",
        "当前还没有新内容",
        "请先拍照或上传教材、练习题、图片后再开始这次学习。",
        "primary",
      );
      return false;
    }
    return true;
  }, [launchLessonId, showNotice]);

  const startGenerateFlow = useCallback(
    async (
      source: InputSource,
      preferredContentType?: InputContentType,
      asset?: GenerateAssetMeta,
    ) => {
      if (generatingSource) {
        return;
      }
      if (!launchLessonId) {
        showNotice(
          "empty",
          "当前还没有新内容",
          "请先拍照或上传教材、练习题、图片后再开始这次学习。",
          "primary",
        );
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
        preferredContentType,
        asset,
      });

      clearGenerationTimers();
      setGenerationStepIndex(0);
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
          preferredContentType,
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
          preferredContentType,
          asset,
          analysis: {
            ...analysis,
            recommendedLessonId: analysis.recommendedLessonId ?? GENERATED_DYNAMIC_LESSON_ID,
          },
        });

        addInput(nextInput);
        queueGeneratedLesson(nextInput, source, nextInput.lessonId ?? GENERATED_DYNAMIC_LESSON_ID);
      } catch (error) {
        const fallbackInput = provisionalInput;
        addInput(fallbackInput);
        queueGeneratedLesson(fallbackInput, source, fallbackInput.lessonId ?? launchLessonId);
        showNotice(
          "content-analyze-fallback",
          "内容已收到",
          toUserErrorMessage(error, "暂时无法完成完整识别，已先按当前信息安排学习路线。"),
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
      showNotice("camera-permission", "需要相机权限", "允许相机权限后，才能拍照并安排当前学习内容。", "primary");
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

  const pickPhotoLibraryAsset = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showNotice("library-permission", "需要照片权限", "允许照片权限后，才能从相册选择图片并安排学习内容。", "primary");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
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

  const pickDocumentAsset = useCallback(async (): Promise<{
    asset: GenerateAssetMeta;
    preferredContentType?: InputContentType;
  } | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.length) {
      return null;
    }

    const asset = result.assets[0];
    const assetName = asset.name?.toLowerCase() ?? "";
    const preferredContentType =
      asset.mimeType === "application/pdf" || assetName.endsWith(".pdf") ? "pdf" : undefined;

    return {
      asset: {
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
        size: asset.size,
      } satisfies GenerateAssetMeta,
      preferredContentType,
    };
  }, []);

  const handleCameraStart = useCallback(async () => {
    if (pendingSelection || generatingSource || !canStartGenerateFlow()) {
      return;
    }

    try {
      const asset = await pickCameraAsset();
      if (!asset) {
        return;
      }
      openSelectionPreview("camera", "camera", undefined, asset);
    } catch (error) {
      showNotice(
        "camera-error",
        "暂时无法打开相机",
        toUserErrorMessage(error, "请稍后重试，或先使用上传内容入口。"),
        "primary",
      );
    }
  }, [
    canStartGenerateFlow,
    generatingSource,
    openSelectionPreview,
    pendingSelection,
    pickCameraAsset,
    showNotice,
  ]);

  const handlePhotoLibraryStart = useCallback(async () => {
    if (pendingSelection || generatingSource || !canStartGenerateFlow()) {
      return;
    }

    try {
      const asset = await pickPhotoLibraryAsset();
      if (!asset) {
        return;
      }
      openSelectionPreview("upload", "library", undefined, asset);
    } catch (error) {
      showNotice(
        "library-error",
        "暂时无法打开相册",
        toUserErrorMessage(error, "请稍后重试，或先选择 PDF/文件。"),
        "primary",
      );
    }
  }, [
    canStartGenerateFlow,
    generatingSource,
    openSelectionPreview,
    pendingSelection,
    pickPhotoLibraryAsset,
    showNotice,
  ]);

  const handleDocumentUploadStart = useCallback(async () => {
    if (pendingSelection || generatingSource || !canStartGenerateFlow()) {
      return;
    }

    try {
      const result = await pickDocumentAsset();
      if (!result) {
        return;
      }
      openSelectionPreview("upload", "document", result.preferredContentType, result.asset);
    } catch (error) {
      showNotice("upload-error", "暂时无法打开文件", toUserErrorMessage(error, "请稍后重试。"), "primary");
    }
  }, [
    canStartGenerateFlow,
    generatingSource,
    openSelectionPreview,
    pendingSelection,
    pickDocumentAsset,
    showNotice,
  ]);

  const dismissPendingSelection = useCallback(() => {
    setPendingSelection(null);
  }, []);

  const confirmPendingSelection = useCallback(() => {
    if (!pendingSelection) {
      return;
    }

    const { source, preferredContentType, asset } = pendingSelection;
    setPendingSelection(null);
    void startGenerateFlow(source, preferredContentType, asset);
  }, [pendingSelection, startGenerateFlow]);

  const retakePendingSelection = useCallback(async () => {
    if (!pendingSelection) {
      return;
    }

    const { pickerKind } = pendingSelection;
    setPendingSelection(null);

    try {
      if (pickerKind === "camera") {
        const asset = await pickCameraAsset();
        if (asset) {
          openSelectionPreview("camera", "camera", undefined, asset);
        }
        return;
      }

      if (pickerKind === "library") {
        const asset = await pickPhotoLibraryAsset();
        if (asset) {
          openSelectionPreview("upload", "library", undefined, asset);
        }
        return;
      }

      const result = await pickDocumentAsset();
      if (result) {
        openSelectionPreview("upload", "document", result.preferredContentType, result.asset);
      }
    } catch (error) {
      showNotice("retake-error", "暂时无法重新选择", toUserErrorMessage(error, "请稍后重试。"), "primary");
    }
  }, [
    openSelectionPreview,
    pendingSelection,
    pickCameraAsset,
    pickDocumentAsset,
    pickPhotoLibraryAsset,
    showNotice,
  ]);

  const openUploadChooser = useCallback(() => {
    if (pendingSelection || generatingSource || !canStartGenerateFlow()) {
      return;
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["取消", "从相册选图", "选择 PDF/文件"],
          cancelButtonIndex: 0,
          userInterfaceStyle: "light",
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            void handlePhotoLibraryStart();
          }
          if (buttonIndex === 2) {
            void handleDocumentUploadStart();
          }
        },
      );
      return;
    }

    void handleDocumentUploadStart();
  }, [
    canStartGenerateFlow,
    generatingSource,
    handleDocumentUploadStart,
    handlePhotoLibraryStart,
    pendingSelection,
  ]);

  return {
    generationOverlayAnim,
    generatingSource,
    generationStepIndex,
    activeGeneratedInput,
    pendingSelection,
    handleCameraStart,
    openUploadChooser,
    dismissPendingSelection,
    confirmPendingSelection,
    retakePendingSelection,
  };
}
