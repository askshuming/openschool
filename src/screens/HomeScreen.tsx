import { Ionicons } from "@expo/vector-icons";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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
import { MascotBuddy } from "../components/MascotBuddy";
import { StatusChip } from "../components/StatusChip";
import { HomeCaptureConfirmSheet } from "../components/home/HomeCaptureConfirmSheet";
import { HomeCaptureSupportPanel } from "../components/home/HomeCaptureSupportPanel";
import { HomeGenerationOverlay } from "../components/home/HomeGenerationOverlay";
import { HomeJourneyCard } from "../components/home/HomeJourneyCard";
import { HomeNoticeCard } from "../components/home/HomeNoticeCard";
import { ScreenErrorState } from "../components/states/ScreenErrorState";
import { ScreenLoadingState } from "../components/states/ScreenLoadingState";
import { ScreenOfflineState } from "../components/states/ScreenOfflineState";
import { colors, motion, radius, spacing } from "../design/tokens";
import { layoutStyles, textStyles } from "../design/theme";
import { useCatalog } from "../hooks/useCatalog";
import { useParentSettings } from "../hooks/useParentSettings";
import { useProgressSummary } from "../hooks/useProgressSummary";
import { useHomeGenerationFlow } from "../hooks/useHomeGenerationFlow";
import { useReviewQueue } from "../hooks/useReviewQueue";
import { AppTabParamList } from "../navigation/types";
import { buildHomeJourneyPresentation } from "../domain/learningJourneyPresentation";
import { useAppState } from "../state/AppState";
import {
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

export function HomeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const noticeAnim = useRef(new Animated.Value(0)).current;
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
  const homePhase = homeJourney.primaryAction.kind;
  const journeyLessonTitle =
    journeySession?.lessonTitle ??
    lastCompletedSession?.lessonTitle ??
    resumableJourneyInput?.title ??
    launchLesson?.title ??
    "这份内容";
  const routeFocusLabel = resumableJourneyInput?.routeLabel ?? "当前学习路线";
  const routeFocusStep = resumableJourneyInput?.recommendedEntryStep ?? "先拍不会的这一页";
  const routeChallenge =
    latestInput && latestInput.id === resumableJourneyInput?.id
      ? latestInput.primaryChallenge
      : "课文页、阅读题、作文题、生字词都能直接拍。";
  const heroTitle =
    homePhase === "resume_session"
      ? "这一页，继续往下学"
      : homePhase === "open_review_focus"
        ? "这一页，先稳稳收住"
        : resumableJourneyInput
          ? "这一页，已经安排好第一步"
          : "不会的这一页，拍一下";
  const heroSubtitle =
    homePhase === "resume_session"
      ? `当前在学「${journeyLessonTitle}」第 ${step}/${Math.max(totalSteps, 1)} 步，学完会自动接温和复习。`
      : homePhase === "open_review_focus"
        ? `刚学完「${journeyLessonTitle}」，现在先做 ${pendingReviewCount} 项温和复习，把这次内容收住。`
        : resumableJourneyInput
          ? `已识别为 ${routeFocusLabel}，先做「${routeFocusStep}」。`
          : "课文页、阅读题、作文题、生字词，都能直接拍下来开始学。";
  const heroMascotSpeech =
    homePhase === "resume_session"
      ? "从这一步接着来"
      : homePhase === "open_review_focus"
        ? "先稳稳复习一题"
        : resumableJourneyInput
          ? "我先带你做第一步"
          : "不会的那页拍给我";
  const capturePrimarySubtitle = resumableJourneyInput
    ? "再拍新的一页，我继续安排下一条学习路线"
    : "系统先识别内容，再安排孩子能开始的第一步";
  const captureEntryHint = resumableJourneyInput
    ? "拍照始终是主入口，刚拍下的一页会在下面自动续上"
    : "拍照学习是整个产品的起点";
  const journeyHeadline =
    homePhase === "resume_session"
      ? `继续第 ${step}/${Math.max(totalSteps, 1)} 步`
      : homePhase === "open_review_focus"
        ? "先做 1 题温和复习"
        : resumableJourneyInput
          ? `先做「${routeFocusStep}」`
          : "先拍不会的这一页";
  const journeyBody =
    homePhase === "resume_session"
      ? `${journeyLessonTitle} 已经接上了，学完这一轮会自动转到温和复习。`
      : homePhase === "open_review_focus"
        ? `${journeyLessonTitle} 刚学完，先用眼前这 1 题把它收住。`
        : resumableJourneyInput
          ? `${routeFocusLabel} · ${routeChallenge}`
          : "课文页、阅读题、作文题、生字词，都能直接拍下来开始学。";

  const refreshing =
    progressQuery.isRefetching ||
    catalogQuery.isRefetching ||
    reviewQueueQuery.isRefetching ||
    settingsQuery.isRefetching;

  const heroMinHeight = Math.max(540, Math.min(680, viewportHeight - insets.top - 108));

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

  const {
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
  } = useHomeGenerationFlow({
    launchLessonId: launchLesson?.id ?? null,
    latestInput,
    recentInputCount: recentInputs.length,
    focusLabel,
    gradeLabel: childGradeLabel,
    readingLevel: childProfile?.readingLevel,
    addInput,
    recordGeneratedInput,
    onNotice: setNotice,
    onNavigateToSession: ({ lessonId, generationSource, contentInputId }) => {
      navigation.navigate("Session", {
        forceNew: true,
        lessonId,
        generationSource,
        contentInputId,
      });
    },
  });

  const generationPromises = [
    {
      title: "看清这一页",
      detail: activeGeneratedInput
        ? `${getContentTypeLabel(activeGeneratedInput.contentType)} · ${activeGeneratedInput.title}`
        : "先把这一页看清楚",
    },
    {
      title: "找到先学的点",
      detail: activeGeneratedInput
        ? `${activeGeneratedInput.routeLabel} · ${activeGeneratedInput.primaryChallenge}`
        : `${childGradeLabel} · ${focusLabel}优先 · ${readingLevelLabel}`,
    },
    {
      title: "直接开始",
      detail: activeGeneratedInput
        ? `${activeGeneratedInput.recommendedEntryStep} · 共 ${activeGeneratedInput.generatedTaskCount} 步`
        : "会直接安排成孩子现在能开始的 3-5 步学习路线",
    },
  ];

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
            <MascotBuddy state="teacher" size={62} speech={heroMascotSpeech} />
          </Animated.View>

          <View style={styles.heroTopRow}>
            <StatusChip label={`连续学习 ${streakDays} 天`} tone="accent" />
            <Text style={styles.meta}>{todayLabel}</Text>
          </View>

          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSubtitle} numberOfLines={2}>
            {childProfile?.nickname ? `${childProfile.nickname}，${heroSubtitle}` : heroSubtitle}
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
                <Text style={styles.captureCenterHint}>主入口</Text>
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
                  <Text style={styles.capturePrimarySubtitle}>{capturePrimarySubtitle}</Text>
                </Pressable>
                <Text style={styles.captureCenterArrow}>{captureEntryHint}</Text>
              </Animated.View>
            </View>

            <HomeCaptureSupportPanel
              latestInput={latestInput}
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
            <HomeNoticeCard title={notice.title} body={notice.body} tone={notice.tone} />
          </Animated.View>
        ) : null}

        <HomeJourneyCard
          statusLabel={homeJourney.statusLabel}
          statusTone={homeJourney.statusTone}
          headline={journeyHeadline}
          body={journeyBody}
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

      <HomeCaptureConfirmSheet
        visible={Boolean(pendingSelection)}
        previewInput={pendingSelection?.previewInput ?? null}
        retakeLabel={pendingSelection?.pickerKind === "camera" ? "重拍这一页" : "重新选择"}
        onRetake={() => {
          void retakePendingSelection();
        }}
        onConfirm={confirmPendingSelection}
        onClose={dismissPendingSelection}
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
  heroTitle: {
    ...textStyles.h1,
    color: colors.textPrimary,
    fontSize: 35,
    lineHeight: 42,
  },
  heroSubtitle: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 21,
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
    letterSpacing: 0.2,
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
  homeFootnote: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  meta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
});
