import { Ionicons } from "@expo/vector-icons";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Animated,
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
import { AppCard } from "../components/AppCard";
import { MascotBuddy } from "../components/MascotBuddy";
import { StatusChip } from "../components/StatusChip";
import { HomeCaptureSupportPanel } from "../components/home/HomeCaptureSupportPanel";
import { HomeGenerationOverlay } from "../components/home/HomeGenerationOverlay";
import { HomeJourneyCard } from "../components/home/HomeJourneyCard";
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
import { buildHomeJourneyPresentation } from "../domain/learningJourneyPresentation";
import { useAppState } from "../state/AppState";
import {
  ContentInputRecord,
  createContentInputRecord,
  getContentTypeLabel,
  getInputSourceLabel,
  getRelativeInputTimeLabel,
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
  const latestInput = recentInputs[0] ?? null;
  const activeGeneratedInput = pendingGeneratedInput ?? latestInput;
  const resumableJourneyInput = journeyInput ?? latestInput;
  const homeJourney = buildHomeJourneyPresentation({
    resumableInput: resumableJourneyInput,
    currentSession: journeySession,
    lastCompletedSession,
    lastCompletedReview,
    hasInProgress,
    pendingReviewCount,
    sessionStep: step,
    sessionTotalSteps: totalSteps,
    defaultLessonTitle: inProgressLesson?.title,
    childDisplayName: childProfile?.nickname ?? "孩子",
  });

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

  function runHomeJourneyAction(kind: typeof homeJourney.primaryAction.kind | typeof homeJourney.secondaryAction.kind) {
    switch (kind) {
      case "resume_session":
        resumeSession();
        break;
      case "open_review_focus":
        navigation.navigate("Review", firstPendingReview ? { focusReviewId: firstPendingReview.id } : undefined);
        break;
      case "start_content":
        startJourneyLearning();
        break;
      case "capture":
        void handleCameraStart();
        break;
      case "open_review":
        navigation.navigate("Review");
        break;
      case "open_parent":
        navigation.navigate("Parent");
        break;
      default:
        break;
    }
  }

  const journeyPrimaryAction = {
    label: homeJourney.primaryAction.label,
    onPress: () => runHomeJourneyAction(homeJourney.primaryAction.kind),
  };
  const secondaryAction = {
    title: homeJourney.secondaryAction.title,
    icon: homeJourney.secondaryAction.icon,
    onPress: () => runHomeJourneyAction(homeJourney.secondaryAction.kind),
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

            <HomeCaptureSupportPanel
              latestInput={latestInput}
              stageSupportTitle={stageSupportTitle}
              stageSupportMeta={stageSupportMeta}
              stageSupportSummary={stageSupportSummary}
              supportedInputLabels={supportedInputLabels}
              childGradeLabel={childGradeLabel}
              focusLabel={focusLabel}
              onUploadPress={openUploadChooser}
              secondaryAction={secondaryAction}
            />
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

        <HomeJourneyCard
          statusLabel={homeJourney.statusLabel}
          statusTone={homeJourney.statusTone}
          headline={homeJourney.headline}
          body={homeJourney.body}
          inputDone={homeJourney.inputDone}
          inputMeta={homeJourney.inputMeta}
          inputStatusLabel={homeJourney.inputStatusLabel}
          learningDone={homeJourney.learningDone}
          learningDisplay={homeJourney.learningDisplay}
          learningStatusLabel={homeJourney.learningStatusLabel}
          learningTone={hasInProgress ? "accent" : "primary"}
          reviewDone={homeJourney.reviewDone}
          reviewMeta={homeJourney.reviewMeta}
          reviewStatusLabel={homeJourney.reviewStatusLabel}
          reviewTone={pendingReviewCount > 0 ? "accent" : "primary"}
          footnote={
            resumableJourneyInput
              ? `最近更新：${getRelativeInputTimeLabel(resumableJourneyInput.createdAt)}`
              : "主线会在拍照或上传后自动建立"
          }
          actionLabel={journeyPrimaryAction.label}
          onAction={journeyPrimaryAction.onPress}
        />

        <Text style={styles.homeFootnote}>
          已完成 {completedLessons} 次学习，提醒时间 {reminderText}，数据源：{getApiModeLabel()}
        </Text>
      </ScrollView>

      <HomeGenerationOverlay
        visible={Boolean(generatingSource)}
        animationValue={generationOverlayAnim}
        currentStepIndex={generationStepIndex}
        steps={generationPromises}
        activeInput={activeGeneratedInput}
        sourceLabel={getInputSourceLabel(generatingSource ?? "camera")}
      />
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
  capturePrimaryStage: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  capturePrimaryWrap: {
    width: "100%",
    alignItems: "center",
    gap: 6,
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
  heroActionPressed: {
    transform: [{ scale: 0.988 }],
    opacity: 0.92,
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
  noticeCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cardText: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  homeFootnote: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
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
