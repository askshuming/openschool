import { Ionicons } from "@expo/vector-icons";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trackEvent } from "../analytics/tracker";
import { analyzeContentApi, getApiModeLabel } from "../api/service";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { MascotBuddy } from "../components/MascotBuddy";
import { StatusChip } from "../components/StatusChip";
import { ScreenErrorState } from "../components/states/ScreenErrorState";
import { ScreenLoadingState } from "../components/states/ScreenLoadingState";
import { ScreenOfflineState } from "../components/states/ScreenOfflineState";
import { colors, motion, radius, spacing } from "../design/tokens";
import { layoutStyles, textStyles } from "../design/theme";
import { useCatalog } from "../hooks/useCatalog";
import { useParentSettings } from "../hooks/useParentSettings";
import { useProgressSummary } from "../hooks/useProgressSummary";
import { useReviewQueue } from "../hooks/useReviewQueue";
import { AppTabParamList } from "../navigation/types";
import { useAppState } from "../state/AppState";
import {
  ContentInputRecord,
  createContentInputRecord,
  getContentTypeLabel,
  getInputSourceLabel,
  getRelativeInputTimeLabel,
  getReadableFileSizeLabel,
  hasImagePreview,
  useContentInputStore,
} from "../state/contentInputStore";
import { useLearningJourneyStore } from "../state/learningJourneyStore";
import { useSessionStore } from "../state/sessionStore";
import { formatCnMonthDayWeek } from "../utils/date";
import { isOfflineError, toUserErrorMessage } from "../utils/errorMessage";
import { triggerFeedback } from "../utils/feedback";

type Props = BottomTabScreenProps<AppTabParamList, "Home">;
type GenerateSource = "camera" | "upload";
type GenerateAssetMeta = {
  name?: string | null;
  uri?: string | null;
  mimeType?: string | null;
  size?: number;
  width?: number;
  height?: number;
  base64?: string | null;
};

type HomeNotice = {
  id: string;
  title: string;
  body: string;
  tone: "success" | "primary";
};

const gradeLabelMap: Record<string, string> = {
  G1: "一年级",
  G2: "二年级",
  G3: "三年级",
  G4: "四年级",
  G5: "五年级",
  G6: "六年级",
};

const readingLevelLabelMap = {
  normal: "基础较稳定",
  struggling: "需要适度引导",
  very_struggling: "需要更多引导",
} as const;

const supportedInputLabels = ["教材页", "练习题", "板书", "图片"] as const;
const GENERATED_DYNAMIC_LESSON_ID = "generated_dynamic";

function pickRecommendedLesson(
  lessons: Array<{ id: string; title: string }>,
  grade?: string,
) {
  if (lessons.length === 0) {
    return null;
  }
  if (!grade) {
    return lessons[0];
  }
  const prefix = grade.toLowerCase();
  return lessons.find((lesson) => lesson.id.toLowerCase().startsWith(`${prefix}_`)) ?? lessons[0];
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

export function HomeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const noticeAnim = useRef(new Animated.Value(0)).current;
  const generationOverlayAnim = useRef(new Animated.Value(0)).current;
  const generationTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const handledCelebrationRef = useRef<string | null>(null);
  const handledReviewRef = useRef<string | null>(null);

  const { childProfile, childId, parentId } = useAppState();
  const recentInputs = useContentInputStore((s) => s.recentInputs);
  const addInput = useContentInputStore((s) => s.addInput);
  const journeyInput = useLearningJourneyStore((s) => s.currentInput);
  const journeySession = useLearningJourneyStore((s) => s.currentSession);
  const lastCompletedSession = useLearningJourneyStore((s) => s.lastCompletedSession);
  const lastCompletedReview = useLearningJourneyStore((s) => s.lastCompletedReview);
  const recordGeneratedInput = useLearningJourneyStore((s) => s.recordGeneratedInput);
  const [notice, setNotice] = useState<HomeNotice | null>(null);
  const [generatingSource, setGeneratingSource] = useState<GenerateSource | null>(null);
  const [generationStepIndex, setGenerationStepIndex] = useState(0);
  const [pendingGeneratedInput, setPendingGeneratedInput] = useState<ContentInputRecord | null>(null);

  const childKey = childId ?? childProfile?.nickname ?? "demo";
  const progressQuery = useProgressSummary(childKey, childId ?? undefined);
  const reviewQueueQuery = useReviewQueue(childKey, childId ?? undefined);
  const settingsQuery = useParentSettings(parentId ?? undefined);
  const catalogQuery = useCatalog();

  const sessionId = useSessionStore((s) => s.sessionId);
  const sessionLessonId = useSessionStore((s) => s.lessonId);
  const sessionHydrated = useSessionStore((s) => s.hasHydrated);
  const step = useSessionStore((s) => s.step);
  const totalSteps = useSessionStore((s) => s.totalSteps);

  const hasInProgress = sessionHydrated && Boolean(sessionId) && step > 0 && step < totalSteps;

  const lessons = catalogQuery.data?.lessons ?? [];
  const recommendedLesson = useMemo(
    () => pickRecommendedLesson(lessons, childProfile?.grade),
    [childProfile?.grade, lessons],
  );
  const inProgressLesson = lessons.find((lesson) => lesson.id === sessionLessonId) ?? null;
  const launchLesson = recommendedLesson ?? inProgressLesson;

  const pendingReviewCount = (reviewQueueQuery.data?.items ?? []).filter(
    (item) => item.status === "pending",
  ).length;
  const firstPendingReview = (reviewQueueQuery.data?.items ?? []).find((item) => item.status === "pending") ?? null;
  const completedLessons = progressQuery.data?.completedLessons ?? 0;
  const streakDays = Math.max(1, completedLessons + (hasInProgress ? 1 : 0));
  const todayLabel = formatCnMonthDayWeek();
  const reminderText = settingsQuery.data?.reminderTime ?? "19:30";
  const childGradeLabel = childProfile?.grade ? gradeLabelMap[childProfile.grade] ?? childProfile.grade : "当前年级";
  const focusLabel = childProfile?.interests?.[0] ?? "阅读";
  const readingLevelLabel = childProfile?.readingLevel
    ? readingLevelLabelMap[childProfile.readingLevel]
    : "系统会自动调节";
  const remainingSteps = Math.max(1, totalSteps - step);
  const latestInput = recentInputs[0] ?? null;
  const activeGeneratedInput = pendingGeneratedInput ?? latestInput;
  const resumableJourneyInput = journeyInput ?? latestInput;
  const journeyLearningDone = Boolean(journeySession?.completedAt || lastCompletedSession?.completedAt);
  const journeyInputStatusLabel = resumableJourneyInput ? "已输入" : "待输入";
  const journeyLearningStatusLabel = hasInProgress
    ? "进行中"
    : journeyLearningDone
      ? "已学完"
      : resumableJourneyInput
        ? "待开始"
        : "未开始";
  const journeyReviewStatusLabel = pendingReviewCount > 0
    ? `${pendingReviewCount} 待复习`
    : lastCompletedReview
      ? "已复习"
      : journeyLearningDone
        ? "待出现"
        : "未开始";
  const journeyHeadline = hasInProgress
    ? "继续把这份内容学完"
    : journeyLearningDone && pendingReviewCount > 0
      ? "学习已完成，下一步做温和复习"
      : resumableJourneyInput
        ? "这份内容已经收好，直接开始学"
        : "先拍一页，主线就会开始";
  const journeyBody = hasInProgress
    ? `${childProfile?.nickname ?? "孩子"} 正在学「${journeySession?.lessonTitle ?? inProgressLesson?.title ?? "当前内容"}」，剩下的步骤不多了。`
    : journeyLearningDone && pendingReviewCount > 0
      ? `刚学完「${journeySession?.lessonTitle ?? lastCompletedSession?.lessonTitle ?? "当前内容"}」，现在最适合做 ${pendingReviewCount} 项温和复习。`
      : resumableJourneyInput
        ? `基于「${resumableJourneyInput.title}」已经排好学习路线，下次打开也能从这里续上。`
        : "拍照或上传后，系统会自动识别内容，并把今天的学习路线和下一步动作串起来。";
  const journeyInputMeta = resumableJourneyInput
    ? `${getInputSourceLabel(resumableJourneyInput.source)} · ${resumableJourneyInput.title}`
    : "拍照或上传后自动记录";
  const journeyLearningMeta = hasInProgress
    ? `第 ${step}/${Math.max(totalSteps, 1)} 步`
    : journeyLearningDone
      ? "已完成"
      : resumableJourneyInput
        ? `${resumableJourneyInput.generatedTaskCount} 步任务`
        : "识别后开始";
  const journeyReviewMeta = pendingReviewCount > 0
    ? `${pendingReviewCount} 项待巩固`
    : lastCompletedReview
      ? `已完成 ${lastCompletedReview.completedCount} 题`
      : journeyLearningDone
        ? "学完后自动出现"
        : "暂未开始";

  const refreshing =
    progressQuery.isRefetching ||
    catalogQuery.isRefetching ||
    reviewQueueQuery.isRefetching ||
    settingsQuery.isRefetching;

  const generationPromises = [
    {
      title: "先看清这一页",
      detail: activeGeneratedInput
        ? `${getContentTypeLabel(activeGeneratedInput.contentType)} · ${activeGeneratedInput.title}，正在识别知识点和题型`
        : "系统正在识别这一页里的知识点和题型",
    },
    {
      title: "再匹配这次该走哪条路线",
      detail: activeGeneratedInput
        ? `${activeGeneratedInput.routeLabel} · 当前卡点：${activeGeneratedInput.primaryChallenge}`
        : `${childGradeLabel} · ${focusLabel}优先 · ${readingLevelLabel}`,
    },
    {
      title: "最后安排成可开始的第一步",
      detail: activeGeneratedInput
        ? `${activeGeneratedInput.recommendedEntryStep} · 共 ${activeGeneratedInput.generatedTaskCount} 步学习路线`
        : "会直接安排成孩子现在能开始的 3-5 步学习路线",
    },
  ];
  const stageSupportTitle = latestInput ? "最近一次输入" : "可直接拍的内容";
  const stageSupportSummary = latestInput
    ? `${latestInput.routeLabel} · ${latestInput.recommendedEntryStep}`
    : "不用先判断内容类型，拍下来就行。";
  const stageSupportMeta = latestInput
    ? `${getInputSourceLabel(latestInput.source)} · ${getRelativeInputTimeLabel(latestInput.createdAt)}`
    : "教材、练习题、板书、图片都可以";
  const heroMinHeight = Math.max(540, Math.min(680, viewportHeight - insets.top - 108));
  function clearGenerationTimers() {
    generationTimersRef.current.forEach((timer) => clearTimeout(timer));
    generationTimersRef.current = [];
  }

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: motion.cardSwitch,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: motion.cardSwitch,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  useEffect(() => () => clearGenerationTimers(), []);

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

  useEffect(() => {
    const celebrationAt = route.params?.celebrationAt;
    if (!celebrationAt || handledCelebrationRef.current === celebrationAt) {
      return;
    }
    handledCelebrationRef.current = celebrationAt;
    setNotice({
      id: celebrationAt,
      title: "学习已完成",
      body: route.params?.celebrationLessonTitle
        ? `已完成「${route.params.celebrationLessonTitle}」，继续保持。`
        : "已完成一节学习任务，继续保持。",
      tone: "success",
    });
    triggerFeedback("success");
    noticeAnim.setValue(0);
    Animated.timing(noticeAnim, {
      toValue: 1,
      duration: motion.normal,
      useNativeDriver: true,
    }).start();
    navigation.setParams({
      celebrationAt: undefined,
      celebrationLessonTitle: undefined,
    });
  }, [navigation, noticeAnim, route.params?.celebrationAt, route.params?.celebrationLessonTitle]);

  useEffect(() => {
    const reviewAt = route.params?.reviewCompletedAt;
    if (!reviewAt || handledReviewRef.current === reviewAt) {
      return;
    }
    handledReviewRef.current = reviewAt;
    const count = Math.max(1, route.params?.reviewCompletedCount ?? 1);
    setNotice({
      id: reviewAt,
      title: "复习进度已同步",
      body:
        route.params?.reviewCompletedMode === "batch"
          ? `今日批量复习已完成 ${count} 题。`
          : `快速复习已完成 ${count} 题。`,
      tone: "primary",
    });
    triggerFeedback("success");
    noticeAnim.setValue(0);
    Animated.timing(noticeAnim, {
      toValue: 1,
      duration: motion.normal,
      useNativeDriver: true,
    }).start();
    navigation.setParams({
      reviewCompletedAt: undefined,
      reviewCompletedCount: undefined,
      reviewCompletedMode: undefined,
    });
  }, [
    navigation,
    noticeAnim,
    route.params?.reviewCompletedAt,
    route.params?.reviewCompletedCount,
    route.params?.reviewCompletedMode,
  ]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (progressQuery.isLoading || catalogQuery.isLoading) {
    return <ScreenLoadingState text="正在加载首页..." />;
  }

  if (progressQuery.isError || catalogQuery.isError) {
    const error = progressQuery.error ?? catalogQuery.error;
    if (isOfflineError(error)) {
      return (
        <ScreenOfflineState
          title="首页离线中"
          message="网络恢复后可继续学习。"
          onRetry={() => {
            progressQuery.refetch();
            catalogQuery.refetch();
            reviewQueueQuery.refetch();
          }}
        />
      );
    }
    return (
      <ScreenErrorState
        title="首页加载失败"
        message={toUserErrorMessage(error, "请稍后重试")}
        onRetry={() => {
          progressQuery.refetch();
          catalogQuery.refetch();
          reviewQueueQuery.refetch();
        }}
      />
    );
  }

  function resumeSession() {
    navigation.navigate("Session", {
      forceNew: false,
      lessonId: sessionLessonId ?? launchLesson?.id,
      generationSource: undefined,
    });
  }

  function startJourneyLearning() {
    if (!resumableJourneyInput) {
      void handleCameraStart();
      return;
    }

    navigation.navigate("Session", {
      forceNew: true,
      lessonId: journeySession?.lessonId ?? resumableJourneyInput.lessonId ?? GENERATED_DYNAMIC_LESSON_ID,
      generationSource: resumableJourneyInput.source,
      contentInputId: resumableJourneyInput.id,
    });
  }

  const journeyPrimaryAction = hasInProgress
    ? {
        label: "继续这节学习",
        onPress: resumeSession,
      }
    : journeyLearningDone && pendingReviewCount > 0
      ? {
          label: "去做温和复习",
          onPress: () =>
            navigation.navigate(
              "Review",
              firstPendingReview ? { focusReviewId: firstPendingReview.id } : undefined,
            ),
        }
      : resumableJourneyInput
        ? {
            label: "开始这份内容",
            onPress: startJourneyLearning,
          }
        : {
            label: "回到拍照入口",
            onPress: handleCameraStart,
          };
  const secondaryAction = hasInProgress
    ? {
        title: "继续学习",
        subtitle: `还剩 ${remainingSteps} 步`,
        icon: "play-circle-outline" as const,
        onPress: resumeSession,
      }
    : journeyLearningDone && pendingReviewCount > 0
      ? {
          title: "去复习",
          subtitle: `${pendingReviewCount} 项待巩固`,
          icon: "refresh-circle-outline" as const,
          onPress: () =>
            navigation.navigate(
              "Review",
              firstPendingReview ? { focusReviewId: firstPendingReview.id } : undefined,
            ),
        }
      : resumableJourneyInput
        ? {
            title: "开始内容",
            subtitle: `${resumableJourneyInput.generatedTaskCount} 步任务`,
            icon: "play-circle-outline" as const,
            onPress: startJourneyLearning,
          }
        : pendingReviewCount > 0
          ? {
              title: "去复习",
              subtitle: `${pendingReviewCount} 项待巩固`,
              icon: "refresh-circle-outline" as const,
              onPress: () => navigation.navigate("Review"),
            }
          : {
              title: "我的",
              subtitle: "查看学习概况",
              icon: "person-circle-outline" as const,
              onPress: () => navigation.navigate("Parent"),
            };

  function showLaunchUnavailableNotice() {
    setNotice({
      id: `empty-${Date.now()}`,
      title: "当前还没有新内容",
      body: "请先拍照或上传教材、练习题、图片后再开始这次学习。",
      tone: "primary",
    });
  }

  function canStartGenerateFlow() {
    if (!launchLesson) {
      showLaunchUnavailableNotice();
      return false;
    }
    return true;
  }

  async function handleCameraStart() {
    if (generatingSource || !canStartGenerateFlow()) {
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setNotice({
          id: `camera-permission-${Date.now()}`,
          title: "需要相机权限",
          body: "允许相机权限后，才能拍照并安排当前学习内容。",
          tone: "primary",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.84,
        allowsEditing: false,
        base64: true,
      });
      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      void startGenerateFlow("camera", undefined, {
        name: asset.fileName,
        uri: asset.uri,
        mimeType: asset.mimeType,
        size: asset.fileSize,
        width: asset.width,
        height: asset.height,
        base64: asset.base64,
      });
    } catch (error) {
      setNotice({
        id: `camera-error-${Date.now()}`,
        title: "暂时无法打开相机",
        body: toUserErrorMessage(error, "请稍后重试，或先使用上传内容入口。"),
        tone: "primary",
      });
    }
  }

  async function handlePhotoLibraryStart() {
    if (generatingSource || !canStartGenerateFlow()) {
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotice({
          id: `library-permission-${Date.now()}`,
          title: "需要照片权限",
          body: "允许照片权限后，才能从相册选择图片并安排学习内容。",
          tone: "primary",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.84,
        allowsEditing: false,
        base64: true,
      });
      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      void startGenerateFlow("upload", undefined, {
        name: asset.fileName,
        uri: asset.uri,
        mimeType: asset.mimeType,
        size: asset.fileSize,
        width: asset.width,
        height: asset.height,
        base64: asset.base64,
      });
    } catch (error) {
      setNotice({
        id: `library-error-${Date.now()}`,
        title: "暂时无法打开相册",
        body: toUserErrorMessage(error, "请稍后重试，或先选择 PDF/文件。"),
        tone: "primary",
      });
    }
  }

  async function handleDocumentUploadStart() {
    if (generatingSource || !canStartGenerateFlow()) {
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const assetName = asset.name?.toLowerCase() ?? "";
      const preferredContentType =
        asset.mimeType === "application/pdf" || assetName.endsWith(".pdf")
          ? "pdf"
          : undefined;

      void startGenerateFlow("upload", preferredContentType, {
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
        size: asset.size,
      });
    } catch (error) {
      setNotice({
        id: `upload-error-${Date.now()}`,
        title: "暂时无法打开文件",
        body: toUserErrorMessage(error, "请稍后重试。"),
        tone: "primary",
      });
    }
  }

  function openUploadChooser() {
    if (generatingSource || !canStartGenerateFlow()) {
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
  }

  function queueGeneratedLesson(
    nextInput: ContentInputRecord,
    source: GenerateSource,
    lessonId: string,
  ) {
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
        navigation.navigate("Session", {
          forceNew: true,
          lessonId,
          generationSource: source,
          contentInputId: nextInput.id,
        });
      }, 1160),
    ];
  }

  async function startGenerateFlow(
    source: GenerateSource,
    preferredContentType?: "textbook" | "worksheet" | "photo" | "pdf",
    asset?: GenerateAssetMeta,
  ) {
    if (generatingSource) {
      return;
    }
    if (!launchLesson) {
      showLaunchUnavailableNotice();
      return;
    }

    trackEvent("home_start_tap", {
      lessonId: launchLesson.id,
      source: source === "camera" ? "home_camera_generate" : "home_upload_generate",
    });

    const provisionalInput = createContentInputRecord({
      source,
      countSeed: recentInputs.length,
      focusLabel,
      gradeLabel: childGradeLabel,
      lessonId: launchLesson.id,
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
        gradeLabel: childGradeLabel,
        focusLabel,
        readingLevel: childProfile?.readingLevel,
        assetBase64,
      });

      const nextInput = createContentInputRecord({
        source,
        countSeed: recentInputs.length,
        focusLabel,
        gradeLabel: childGradeLabel,
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
      queueGeneratedLesson(fallbackInput, source, fallbackInput.lessonId ?? launchLesson.id);
      setNotice({
        id: `content-analyze-fallback-${Date.now()}`,
        title: "内容已收到",
        body: toUserErrorMessage(error, "暂时无法完成完整识别，已先按当前信息安排学习路线。"),
        tone: "primary",
      });
    }
  }

  return (
    <View style={layoutStyles.screen}>
      <ScrollView
        style={layoutStyles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.sm + insets.top,
            paddingBottom: spacing.xxl + Math.max(insets.bottom, spacing.md),
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        scrollIndicatorInsets={{
          top: insets.top,
          bottom: Math.max(insets.bottom, spacing.md),
        }}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        alwaysBounceVertical
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              progressQuery.refetch();
              catalogQuery.refetch();
              reviewQueueQuery.refetch();
              if (parentId) {
                settingsQuery.refetch();
              }
            }}
            tintColor={colors.primary500}
            colors={[colors.primary500]}
          />
        }
      >
        <LinearGradient
          colors={[colors.primary100, colors.primary50]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { minHeight: heroMinHeight }]}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />
          <Animated.View
            style={[
              styles.mascotBubble,
              {
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-2, 5],
                    }),
                  },
                ],
                opacity: floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.88, 1],
                }),
              },
            ]}
          >
            <MascotBuddy state="teacher" size={62} speech="拍一页，交给我" />
          </Animated.View>

          <View style={styles.heroTopRow}>
            <StatusChip label={`连续学习 ${streakDays} 天`} tone="accent" />
            <Text style={styles.meta}>{todayLabel}</Text>
          </View>

          <Text style={styles.heroTitle}>拍一页，马上学</Text>
          <Text style={styles.heroSubtitle} numberOfLines={2}>
            {childProfile?.nickname
              ? `${childProfile.nickname} 负责拍，我来按 ${childGradeLabel} 安排今天的学习路线。`
              : "教材页、练习题、板书、图片都能直接拍。"}
          </Text>

          <View style={styles.heroMain}>
            <View style={styles.capturePrimaryStage}>
              <Animated.View
                style={[
                  styles.capturePrimaryWrap,
                  {
                    transform: [
                      {
                        translateY: floatAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-3, 6],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.captureCenterHint}>首页主功能</Text>
                <Pressable
                  hitSlop={8}
                  onPress={handleCameraStart}
                  style={({ pressed }) => [styles.capturePrimaryAction, pressed && styles.heroActionPressed]}
                >
                  <LinearGradient
                    colors={[colors.primary500, colors.primary600]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.capturePrimaryRing}>
                    <View style={styles.capturePrimaryCore}>
                      <Ionicons name="camera" size={30} color={colors.primary600} />
                    </View>
                  </View>
                  <Text style={styles.capturePrimaryTitle}>拍一下</Text>
                  <Text style={styles.capturePrimarySubtitle}>系统开始识别这一页</Text>
                </Pressable>
                <Text style={styles.captureCenterArrow}>拍照学习是整个产品的入口</Text>
              </Animated.View>
            </View>

            <View style={styles.captureStage}>
              <View style={styles.heroPromiseRow}>
                <View style={styles.heroPromiseIcon}>
                  <Ionicons name="sparkles-outline" size={16} color={colors.primary600} />
                </View>
                <Text style={styles.heroPromiseText}>你拍，系统识别内容并匹配学习路线，不需要手动找课。</Text>
              </View>

              <View style={styles.captureInputCompact}>
                <View style={styles.captureInputCompactIcon}>
                  <Ionicons
                    name={
                      latestInput
                        ? latestInput.contentType === "pdf"
                          ? "document-text-outline"
                          : "scan-outline"
                        : "layers-outline"
                    }
                    size={18}
                    color={colors.primary500}
                  />
                </View>
                <View style={styles.captureInputCompactCopy}>
                  <Text style={styles.captureInputTitle} numberOfLines={1}>
                    {stageSupportTitle}
                  </Text>
                  <Text style={styles.captureInputMeta} numberOfLines={1}>
                    {stageSupportMeta}
                  </Text>
                  <Text style={styles.captureInputSummary} numberOfLines={1}>
                    {latestInput ? stageSupportSummary : "教材页、练习题、板书、图片都能直接拍。"}
                  </Text>
                </View>
                {latestInput ? (
                  <StatusChip label={`${latestInput.generatedTaskCount} 步`} tone="accent" />
                ) : (
                  <View style={styles.captureInputChipRow}>
                    {supportedInputLabels.slice(0, 2).map((item) => (
                      <View key={item} style={styles.captureInputMiniChip}>
                        <Text style={styles.captureInputMiniChipText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.captureOutcomeCard}>
              <Text style={styles.captureOutcomeTitle}>拍完马上得到</Text>
              <View style={styles.captureOutcomeInline}>
                <View style={styles.captureOutcomeBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary600} />
                  <Text style={styles.captureOutcomeBadgeText}>讲解</Text>
                </View>
                <View style={styles.captureOutcomeBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary600} />
                  <Text style={styles.captureOutcomeBadgeText}>短练习</Text>
                </View>
                <View style={styles.captureOutcomeBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary600} />
                  <Text style={styles.captureOutcomeBadgeText}>温和复习</Text>
                </View>
              </View>
              <Text style={styles.captureOutcomeMeta}>按 {childGradeLabel} · {focusLabel} 自动适配</Text>
            </View>

            <View style={styles.captureAssistRow}>
              <Pressable
                hitSlop={8}
                onPress={openUploadChooser}
                style={({ pressed }) => [styles.captureAssistPill, pressed && styles.heroActionPressed]}
              >
                <Ionicons name="cloud-upload-outline" size={16} color={colors.primary500} />
                <Text style={styles.captureAssistText}>上传内容</Text>
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={secondaryAction.onPress}
                style={({ pressed }) => [styles.captureAssistPill, pressed && styles.heroActionPressed]}
              >
                <Ionicons name={secondaryAction.icon} size={16} color={colors.primary500} />
                <Text style={styles.captureAssistText}>{secondaryAction.title}</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {notice ? (
          <Animated.View
            style={[
              styles.noticeWrap,
              {
                opacity: noticeAnim,
                transform: [
                  {
                    translateY: noticeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <AppCard style={[styles.noticeCard, notice.tone === "success" && styles.noticeCardSuccess]}>
              <View style={styles.noticeCardInner}>
                <MascotBuddy
                  state={notice.tone === "success" ? "wow" : "teacher"}
                  size={84}
                  speech={notice.tone === "success" ? "太棒了，又学会一点" : "这条消息我已经帮你同步"}
                />
                <View style={styles.noticeCopy}>
                  <View style={styles.rowTop}>
                    <Text style={textStyles.title}>{notice.title}</Text>
                    <StatusChip
                      label={notice.tone === "success" ? "完成" : "已同步"}
                      tone={notice.tone === "success" ? "accent" : "primary"}
                    />
                  </View>
                  <Text style={styles.cardText}>{notice.body}</Text>
                </View>
              </View>
            </AppCard>
          </Animated.View>
        ) : null}

        <AppCard style={styles.journeyCard}>
          <View style={styles.rowTop}>
            <Text style={textStyles.title}>今天的学习主线</Text>
            <StatusChip
              label={
                hasInProgress
                  ? "学习中"
                  : journeyLearningDone && pendingReviewCount === 0
                    ? "已闭环"
                    : "自动续上"
              }
              tone={hasInProgress || pendingReviewCount > 0 ? "accent" : "primary"}
            />
          </View>
          <View style={styles.journeyFocusCard}>
            <Text style={styles.cardText}>{journeyHeadline}</Text>
            <Text style={styles.journeyLeadText}>{journeyBody}</Text>
          </View>

          <View style={styles.journeyMiniTrack}>
            <View style={[styles.journeyMiniStep, resumableJourneyInput && styles.journeyMiniStepDone]}>
              <Text style={styles.journeyMiniTitle}>输入内容</Text>
              <Text style={styles.journeyMiniMeta} numberOfLines={2}>
                {journeyInputMeta}
              </Text>
              <StatusChip label={journeyInputStatusLabel} tone="primary" />
            </View>

            <View
              style={[
                styles.journeyMiniStep,
                (hasInProgress || journeyLearningDone) && styles.journeyMiniStepDone,
              ]}
            >
              <Text style={styles.journeyMiniTitle}>开始学习</Text>
              <Text style={styles.journeyMiniMeta} numberOfLines={2}>
                {journeySession?.lessonTitle || lastCompletedSession?.lessonTitle
                  ? `${journeySession?.lessonTitle ?? lastCompletedSession?.lessonTitle} · ${journeyLearningMeta}`
                  : journeyLearningMeta}
              </Text>
              <StatusChip label={journeyLearningStatusLabel} tone={hasInProgress ? "accent" : "primary"} />
            </View>

            <View
              style={[
                styles.journeyMiniStep,
                (pendingReviewCount > 0 || lastCompletedReview) && styles.journeyMiniStepDone,
              ]}
            >
              <Text style={styles.journeyMiniTitle}>温和复习</Text>
              <Text style={styles.journeyMiniMeta} numberOfLines={2}>
                {journeyReviewMeta}
              </Text>
              <StatusChip
                label={journeyReviewStatusLabel}
                tone={pendingReviewCount > 0 ? "accent" : "primary"}
              />
            </View>
          </View>

          <View style={styles.journeyFooter}>
            <Text style={styles.journeyFootnote}>
              {resumableJourneyInput
                ? `最近更新：${getRelativeInputTimeLabel(resumableJourneyInput.createdAt)}`
                : "主线会在拍照或上传后自动建立"}
            </Text>
            <View style={styles.journeyActionWrap}>
              <AppButton label={journeyPrimaryAction.label} onPress={journeyPrimaryAction.onPress} />
            </View>
          </View>
        </AppCard>

        <Text style={styles.homeFootnote}>
          已完成 {completedLessons} 次学习，提醒时间 {reminderText}，数据源：{getApiModeLabel()}
        </Text>
      </ScrollView>

      <Modal
        visible={Boolean(generatingSource)}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => undefined}
      >
        <Animated.View
          style={[
            styles.generationOverlay,
            {
              opacity: generationOverlayAnim,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.generationSheet,
              {
                transform: [
                  {
                    translateY: generationOverlayAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [28, 0],
                    }),
                  },
                  {
                    scale: generationOverlayAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.generationHandle} />
            <View style={styles.generationHeader}>
              <Text style={styles.generationTitle}>正在识别这一页并安排学习路线</Text>
              <View style={styles.generationHeaderAside}>
                <MascotBuddy
                  state={generationStepIndex >= 2 ? "wow" : "teacher"}
                  size={68}
                  speech={generationStepIndex >= 2 ? "马上就能开始学啦" : "我来先排好路线"}
                />
                <StatusChip label={`${generationStepIndex + 1}/3`} tone="accent" />
              </View>
            </View>
            <Text style={styles.generationLead}>
              {activeGeneratedInput
                ? `${getInputSourceLabel(generatingSource ?? "camera")}已收到「${activeGeneratedInput.title}」，系统正在识别内容并匹配合适的学习路线。`
                : "这一页已经收到，系统正在完成内容识别和路线安排。"}
            </Text>

            {activeGeneratedInput ? (
              <View style={styles.generationInputCard}>
                {hasImagePreview(activeGeneratedInput) ? (
                  <Image
                    source={{ uri: activeGeneratedInput.previewUri ?? undefined }}
                    style={styles.generationInputPreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.generationInputPreviewFallback}>
                    <Ionicons
                      name={activeGeneratedInput.contentType === "pdf" ? "document-text-outline" : "image-outline"}
                      size={24}
                      color={colors.primary500}
                    />
                  </View>
                )}
                <View style={styles.generationInputContent}>
                  <Text style={styles.generationInputLabel}>本次输入</Text>
                  <Text style={styles.generationInputTitle} numberOfLines={1}>
                    {activeGeneratedInput.title}
                  </Text>
                  <Text style={styles.generationInputMeta} numberOfLines={1}>
                    {getContentTypeLabel(activeGeneratedInput.contentType)} · {activeGeneratedInput.recognizedGradeLabel}
                    {activeGeneratedInput.fileSize
                      ? ` · ${getReadableFileSizeLabel(activeGeneratedInput.fileSize)}`
                      : ""}
                  </Text>
                  {activeGeneratedInput.recognizedTextSnippet ? (
                    <Text style={styles.generationInputSnippet} numberOfLines={2}>
                      识别到：{activeGeneratedInput.recognizedTextSnippet}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {generationPromises.map((item, index) => {
              const state =
                index < generationStepIndex ? "done" : index === generationStepIndex ? "active" : "idle";
              return (
                <View key={item.title} style={styles.generationStepRow}>
                  <View
                    style={[
                      styles.generationStepDot,
                      state === "done" && styles.generationStepDotDone,
                      state === "active" && styles.generationStepDotActive,
                    ]}
                  >
                    {state === "done" ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.generationStepIndexText,
                          state === "active" && styles.generationStepIndexTextActive,
                        ]}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <View style={styles.generationStepContent}>
                    <Text style={styles.generationStepTitle}>{item.title}</Text>
                    <Text style={styles.generationStepText}>{item.detail}</Text>
                  </View>
                </View>
              );
            })}

            <View style={styles.generationPreview}>
              <Text style={styles.generationPreviewMeta}>马上会得到</Text>
              <Text style={styles.generationPreviewTitle}>讲解 + 练习 + 温和复习</Text>
              <Text style={styles.generationPreviewText}>
                {activeGeneratedInput
                  ? `${activeGeneratedInput.routeLabel} · 第一动作为「${activeGeneratedInput.recommendedEntryStep}」`
                  : "不需要再找课，不需要再整理题，路线排好后就能直接带孩子开始学。"}
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.pageHorizontal,
    gap: spacing.sm,
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  heroGlowOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: colors.primary200,
    top: -70,
    left: -50,
    opacity: 0.9,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: colors.accent100,
    right: -36,
    bottom: -50,
    opacity: 0.95,
  },
  mascotBubble: {
    position: "absolute",
    right: -4,
    top: 8,
    width: 76,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingRight: 64,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  heroTitle: {
    ...textStyles.h1,
    color: colors.textPrimary,
    fontSize: 34,
    lineHeight: 40,
  },
  heroSubtitle: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  heroMain: {
    flex: 1,
    justifyContent: "flex-start",
    gap: spacing.sm,
  },
  heroPromiseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.74)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  heroPromiseIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  heroPromiseText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  captureStage: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.xl,
    backgroundColor: "transparent",
  },
  captureInputCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: colors.primary500,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 1,
  },
  captureInputCompactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  captureInputCompactCopy: {
    flex: 1,
    gap: 2,
  },
  captureInputCard: {
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.xs,
  },
  captureInputTitle: {
    ...textStyles.title,
    color: colors.primary600,
    fontSize: 16,
  },
  captureInputMeta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  captureInputChipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  captureInputMiniChip: {
    borderRadius: radius.pill,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  captureInputMiniChipText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  captureInputSummary: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  capturePrimaryStage: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  captureSideCard: {
    width: 88,
    minHeight: 122,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  captureSideIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary100,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  captureSideTitle: {
    ...textStyles.title,
    fontSize: 16,
    textAlign: "center",
  },
  captureSideSubtitle: {
    ...textStyles.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  capturePrimaryWrap: {
    width: "100%",
    alignItems: "center",
    gap: 6,
  },
  captureCenterColumn: {
    alignItems: "center",
    gap: spacing.xxs,
  },
  captureCenterHint: {
    ...textStyles.meta,
    color: colors.primary600,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  captureCenterArrow: {
    ...textStyles.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  capturePrimaryAction: {
    width: "82%",
    maxWidth: 312,
    minHeight: 286,
    borderRadius: 40,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    shadowColor: colors.primary600,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 26,
    elevation: 8,
  },
  capturePrimaryRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  capturePrimaryCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  capturePrimaryTitle: {
    ...textStyles.h2,
    color: "#FFFFFF",
    fontSize: 32,
  },
  capturePrimarySubtitle: {
    ...textStyles.caption,
    color: "rgba(255,255,255,0.84)",
    textAlign: "center",
    lineHeight: 20,
  },
  captureOutcomeCard: {
    alignSelf: "center",
    width: "100%",
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    shadowColor: colors.primary500,
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 1,
  },
  captureOutcomeTitle: {
    ...textStyles.meta,
    color: colors.primary600,
    fontSize: 13,
  },
  captureOutcomeInline: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  captureOutcomeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  captureOutcomeBadgeText: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  captureOutcomeMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  captureAssistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: "82%",
    alignSelf: "center",
  },
  captureAssistPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  captureAssistText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  heroShowcase: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  heroShowcaseCard: {
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  heroShowcaseSourceCard: {
    shadowColor: colors.primary500,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
  },
  heroShowcaseResultCard: {
    alignSelf: "flex-end",
    width: "88%",
    shadowColor: colors.primary500,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  heroShowcaseLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  heroShowcaseText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  heroShowcaseChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  heroShowcaseMiniChip: {
    borderRadius: radius.pill,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  heroShowcaseMiniChipText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  heroShowcaseConnector: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  heroShowcaseLine: {
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: colors.primary200,
  },
  heroShowcaseCameraWrap: {
    padding: 4,
  },
  heroShowcaseCamera: {
    width: 124,
    borderRadius: 26,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
    gap: spacing.xxs,
    shadowColor: colors.primary600,
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 5,
  },
  heroShowcaseCameraInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroShowcaseCameraTitle: {
    ...textStyles.title,
    color: "#FFFFFF",
    fontSize: 17,
  },
  heroShowcaseCameraText: {
    ...textStyles.caption,
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
  },
  heroShowcaseResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  heroShowcaseResultText: {
    ...textStyles.body,
    color: colors.textPrimary,
  },
  heroActionGroup: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  heroPrimaryAction: {
    minHeight: 76,
    borderRadius: radius.lg,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    shadowColor: colors.primary600,
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  heroPrimaryCapture: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  heroPrimaryCaptureRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroPrimaryCaptureCore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroPrimaryTextWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  heroPrimaryTitle: {
    ...textStyles.title,
    color: "#FFFFFF",
  },
  heroPrimarySubtitle: {
    ...textStyles.caption,
    color: "rgba(255,255,255,0.82)",
  },
  heroSecondaryAction: {
    minHeight: 64,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  heroSecondaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary100,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSecondaryTextWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  heroSecondaryTitle: {
    ...textStyles.title,
    fontSize: 16,
  },
  heroSecondarySubtitle: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  heroActionPressed: {
    transform: [{ scale: 0.988 }],
    opacity: 0.92,
  },
  heroChipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  noticeWrap: {
    marginTop: -spacing.xs,
  },
  noticeCard: {
    gap: spacing.xs,
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
  },
  noticeCardSuccess: {
    borderColor: colors.accent300,
    backgroundColor: colors.accent100,
  },
  noticeCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  journeyCard: {
    gap: spacing.sm,
  },
  journeyFocusCard: {
    gap: spacing.xxs,
  },
  journeyLeadText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  journeyMiniTrack: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  journeyMiniStep: {
    flex: 1,
    minWidth: 92,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  journeyMiniStepDone: {
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
  },
  journeyMiniTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  journeyMiniMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
    minHeight: 36,
  },
  journeyStepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary100,
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  journeyStepDotDone: {
    backgroundColor: colors.primary500,
    borderColor: colors.primary500,
  },
  journeyStepCopy: {
    flex: 1,
    gap: 2,
  },
  journeyStepTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  journeyStepMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  journeyFooter: {
    gap: spacing.sm,
  },
  journeyFootnote: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  journeyActionWrap: {
    width: "100%",
  },
  noticeCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cardText: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  generationPanel: {
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary200,
    gap: spacing.sm,
  },
  generationOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 36, 29, 0.26)",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  generationSheet: {
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: spacing.sm,
    shadowColor: colors.primary700,
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 8,
  },
  generationHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.borderLight,
  },
  generationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  generationHeaderAside: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  generationTitle: {
    ...textStyles.title,
    flex: 1,
    fontSize: 17,
  },
  generationLead: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  generationInputCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    padding: spacing.sm,
  },
  generationInputPreview: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.primary100,
  },
  generationInputPreviewFallback: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.primary100,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  generationInputContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  generationInputLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  generationInputTitle: {
    ...textStyles.title,
    fontSize: 17,
  },
  generationInputMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  generationInputSnippet: {
    ...textStyles.caption,
    color: colors.primary600,
  },
  generationStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  generationStepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bgBase,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  generationStepDotDone: {
    backgroundColor: colors.primary500,
    borderColor: colors.primary500,
  },
  generationStepDotActive: {
    backgroundColor: colors.primary100,
    borderColor: colors.primary500,
  },
  generationStepIndexText: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  generationStepIndexTextActive: {
    color: colors.primary500,
  },
  generationStepContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  generationStepTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  generationStepText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  generationPreview: {
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  generationPreviewMeta: {
    ...textStyles.meta,
    color: colors.primary500,
  },
  generationPreviewTitle: {
    ...textStyles.title,
    fontSize: 17,
  },
  generationPreviewText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  homeFootnote: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  homeMetaCard: {
    gap: spacing.sm,
  },
  pathCard: {
    gap: spacing.sm,
  },
  recentInputCard: {
    gap: spacing.sm,
  },
  recentInputBody: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
  },
  recentInputPreview: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.primary100,
  },
  recentInputPreviewFallback: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.primary100,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  recentInputContent: {
    flex: 1,
    gap: spacing.xxs,
    justifyContent: "center",
  },
  recentInputSnippet: {
    ...textStyles.caption,
    color: colors.primary600,
  },
  recentInputHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  pathTitle: {
    ...textStyles.title,
    fontSize: 20,
    lineHeight: 28,
  },
  quickLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  link: {
    ...textStyles.meta,
    color: colors.primary500,
    fontWeight: "700",
  },
  meta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
});
