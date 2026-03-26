import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trackEvent } from "../analytics/tracker";
import { queryKeys } from "../api/queryKeys";
import {
  clearSessionCache,
  deleteChildProfileApi,
  getApiModeLabel,
  getParentDataExportApi,
  revokeGuardianConsentApi,
  updateParentSettingsApi,
} from "../api/service";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { MascotState } from "../components/MascotBuddy";
import { ParentDetailSection } from "../components/parent/ParentDetailSection";
import { ParentGrowthCard } from "../components/parent/ParentGrowthCard";
import { ParentHeroCard } from "../components/parent/ParentHeroCard";
import { ParentJourneyCard } from "../components/parent/ParentJourneyCard";
import { ParentLatestInputCard } from "../components/parent/ParentLatestInputCard";
import { ParentMetricsGrid } from "../components/parent/ParentMetricsGrid";
import { ParentProfileCard } from "../components/parent/ParentProfileCard";
import { StatusChip } from "../components/StatusChip";
import { ScreenErrorState } from "../components/states/ScreenErrorState";
import { ScreenLoadingState } from "../components/states/ScreenLoadingState";
import { ScreenOfflineState } from "../components/states/ScreenOfflineState";
import { colors, spacing } from "../design/tokens";
import { layoutStyles, textStyles } from "../design/theme";
import { buildParentJourneyPresentation } from "../domain/learningJourneyPresentation";
import { useCatalog } from "../hooks/useCatalog";
import { useGuardianConsentRecord } from "../hooks/useGuardianConsentRecord";
import { AppTabParamList } from "../navigation/types";
import { useProgressSummary } from "../hooks/useProgressSummary";
import { useParentSettings } from "../hooks/useParentSettings";
import { useReviewQueue } from "../hooks/useReviewQueue";
import { useWeeklyReport } from "../hooks/useWeeklyReport";
import { useAppState } from "../state/AppState";
import {
  useContentInputStore,
} from "../state/contentInputStore";
import { useLearningJourneyStore } from "../state/learningJourneyStore";
import { useSessionStore } from "../state/sessionStore";
import { isOfflineError, toUserErrorMessage } from "../utils/errorMessage";

const skillLabelMap = {
  vocab: "字词理解",
  sentence_understanding: "句段理解",
  structure: "结构分析",
  main_idea: "主旨概括",
  evidence_locating: "证据句定位",
  recitation: "朗读背诵",
} as const;

const relationLabelMap = {
  father: "父亲",
  mother: "母亲",
  other_guardian: "其他监护人",
} as const;

const gradeLabelMap = {
  G1: "一年级",
  G2: "二年级",
  G3: "三年级",
  G4: "四年级",
  G5: "五年级",
  G6: "六年级",
} as const;

function recitationSegmentLabel(segmentId: string) {
  const normalized = segmentId.replace(/_/g, " · ");
  return `不稳定片段：${normalized}`;
}

const durationLimitOptions = [10, 15, 20, 30] as const;
const reminderTimeOptions = ["18:30", "19:00", "19:30", "20:00"] as const;

type Props = BottomTabScreenProps<AppTabParamList, "Parent">;

export function ParentScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { childProfile, childId, parentId, clearChildProfile, clearAllState } = useAppState();
  const recentInputs = useContentInputStore((s) => s.recentInputs);
  const journeyInput = useLearningJourneyStore((s) => s.currentInput);
  const journeySession = useLearningJourneyStore((s) => s.currentSession);
  const lastCompletedSession = useLearningJourneyStore((s) => s.lastCompletedSession);
  const lastCompletedReview = useLearningJourneyStore((s) => s.lastCompletedReview);
  const sessionLessonId = useSessionStore((s) => s.lessonId);
  const sessionStep = useSessionStore((s) => s.step);
  const sessionTotalSteps = useSessionStore((s) => s.totalSteps);
  const clearSession = useSessionStore((s) => s.clearSession);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [durationDraft, setDurationDraft] = useState<number | null>(null);
  const [reminderDraft, setReminderDraft] = useState<string | null>(null);
  const [settingsSaveMessage, setSettingsSaveMessage] = useState<string | null>(null);
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedDetailSections, setExpandedDetailSections] = useState<{
    content: boolean;
    diagnosis: boolean;
    settings: boolean;
    data: boolean;
  }>({
    content: false,
    diagnosis: false,
    settings: false,
    data: false,
  });
  const [exportSummary, setExportSummary] = useState<string | null>(null);
  const [dataManageError, setDataManageError] = useState<string | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [revokeConfirming, setRevokeConfirming] = useState(false);
  const weeklyReportOpenedKeyRef = useRef<string | null>(null);
  const childKey = childId ?? childProfile?.nickname ?? "demo";
  const catalogQuery = useCatalog();
  const progressQuery = useProgressSummary(childKey, childId ?? undefined);
  const weeklyReportQuery = useWeeklyReport(childKey, childId ?? undefined, parentId ?? undefined);
  const settingsQuery = useParentSettings(parentId ?? undefined);
  const consentRecordQuery = useGuardianConsentRecord(parentId ?? undefined);
  const reviewQueueQuery = useReviewQueue(childKey, childId ?? undefined);
  const hasInProgress = sessionStep > 0 && sessionStep < sessionTotalSteps;
  const shouldLoadSettings = Boolean(parentId);
  const settingsMutation = useMutation({
    mutationFn: updateParentSettingsApi,
    onSuccess: (result) => {
      if (parentId) {
        queryClient.setQueryData(queryKeys.parentSettings(parentId), result);
      }
      setSettingsSaveError(null);
      setSettingsSaveMessage("家长设置已保存");
    },
    onError: (error) => {
      setSettingsSaveMessage(null);
      setSettingsSaveError(toUserErrorMessage(error, "设置保存失败，请稍后重试。"));
    },
  });
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!parentId || !childId) {
        throw new Error("请先创建孩子档案后再导出数据");
      }
      return getParentDataExportApi(parentId, childId);
    },
    onSuccess: (result) => {
      setDataManageError(null);
      const date = result.exportedAt.slice(0, 10);
      setExportSummary(
        `已导出 ${date} 数据：作答 ${result.attemptsCount} 次，朗读 ${result.recitationsCount} 次。`,
      );
    },
    onError: (error) => {
      setExportSummary(null);
      setDataManageError(toUserErrorMessage(error, "导出失败，请稍后重试。"));
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteChildProfileApi,
    onSuccess: () => {
      clearSession();
      clearSessionCache();
      queryClient.removeQueries({ queryKey: ["session"] });
      queryClient.removeQueries({ queryKey: ["progress-summary"] });
      queryClient.removeQueries({ queryKey: ["weekly-report"] });
      queryClient.removeQueries({ queryKey: ["review-queue"] });
      setDataManageError(null);
      setExportSummary(null);
      setDeleteConfirming(false);
      setRevokeConfirming(false);
      clearChildProfile();
    },
    onError: (error) => {
      setDataManageError(toUserErrorMessage(error, "删除失败，请稍后重试。"));
    },
  });
  const revokeConsentMutation = useMutation({
    mutationFn: revokeGuardianConsentApi,
    onSuccess: () => {
      clearSession();
      clearSessionCache();
      queryClient.removeQueries({ queryKey: ["session"] });
      queryClient.removeQueries({ queryKey: ["progress-summary"] });
      queryClient.removeQueries({ queryKey: ["weekly-report"] });
      queryClient.removeQueries({ queryKey: ["review-queue"] });
      queryClient.removeQueries({ queryKey: ["parent-settings"] });
      queryClient.removeQueries({ queryKey: ["guardian-consent-record"] });
      setDataManageError(null);
      setExportSummary(null);
      setDeleteConfirming(false);
      setRevokeConfirming(false);
      clearAllState();
    },
    onError: (error) => {
      setDataManageError(toUserErrorMessage(error, "撤回失败，请稍后重试。"));
    },
  });

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) {
      return;
    }
    setDurationDraft(settings.studyDurationLimitMin);
    setReminderDraft(settings.reminderTime);
  }, [settingsQuery.data?.studyDurationLimitMin, settingsQuery.data?.reminderTime]);

  useEffect(() => {
    if (!parentId || !childId || !weeklyReportQuery.data) {
      return;
    }
    const key = `${parentId}:${childId}:${weeklyReportQuery.data.requestId}`;
    if (weeklyReportOpenedKeyRef.current === key) {
      return;
    }
    weeklyReportOpenedKeyRef.current = key;
    trackEvent("weekly_report_opened", {
      parentId,
      childId,
    });
  }, [childId, parentId, weeklyReportQuery.data]);

  if (
    catalogQuery.isLoading ||
    progressQuery.isLoading ||
    weeklyReportQuery.isLoading ||
    reviewQueueQuery.isLoading ||
    (shouldLoadSettings && settingsQuery.isLoading)
  ) {
    return <ScreenLoadingState text="正在加载学习概况..." />;
  }

  if (
    catalogQuery.isError ||
    progressQuery.isError ||
    weeklyReportQuery.isError ||
    reviewQueueQuery.isError ||
    (shouldLoadSettings && settingsQuery.isError)
  ) {
    const error =
      catalogQuery.error ??
      progressQuery.error ??
      weeklyReportQuery.error ??
      reviewQueueQuery.error ??
      settingsQuery.error;
    if (isOfflineError(error)) {
      return (
        <ScreenOfflineState
          title="概况页离线中"
          message="网络恢复后可继续查看学习概况与设置。"
          onRetry={() => {
            catalogQuery.refetch();
            progressQuery.refetch();
            weeklyReportQuery.refetch();
            reviewQueueQuery.refetch();
            if (shouldLoadSettings) {
              settingsQuery.refetch();
            }
          }}
        />
      );
    }
    return (
      <ScreenErrorState
        title="学习概况加载失败"
        message={toUserErrorMessage(error, "请稍后重试")}
        onRetry={() => {
          catalogQuery.refetch();
          progressQuery.refetch();
          weeklyReportQuery.refetch();
          reviewQueueQuery.refetch();
        }}
      />
    );
  }

  const progress = progressQuery.data;
  const report = weeklyReportQuery.data;
  const lessons = catalogQuery.data?.lessons ?? [];
  const safeCompletedLessons = Math.min(report?.weeklyCompletedLessons ?? 0, lessons.length);
  const recentLesson = lessons.find((lesson) => lesson.id === sessionLessonId) ?? lessons[0] ?? null;
  const activeLessonId = selectedLessonId ?? recentLesson?.id ?? lessons[0]?.id ?? null;
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? null;
  const parentSettings = settingsQuery.data ?? null;
  const latestInput = recentInputs[0] ?? null;
  const resumableInput = journeyInput ?? latestInput;
  const latestTextbookInput = recentInputs.find((item) => item.contentType === "textbook") ?? null;
  const uploadedTextbookLabel =
    childProfile?.textbookVersion?.trim() || latestTextbookInput?.textbookVersion?.trim() || null;
  const focusLabel = childProfile?.interests?.[0] ?? "综合";
  const childDisplayName = childProfile?.nickname ?? "孩子";
  const childGradeLabel = childProfile?.grade
    ? gradeLabelMap[childProfile.grade as keyof typeof gradeLabelMap] ?? childProfile.grade
    : "未设置年级";
  const pendingReviewItems = (reviewQueueQuery.data?.items ?? []).filter((item) => item.status === "pending");
  const pendingReviewCount = pendingReviewItems.length;
  const firstPendingReview = pendingReviewItems[0] ?? null;
  const parentJourney = buildParentJourneyPresentation({
    resumableInput,
    currentSession: journeySession,
    lastCompletedSession,
    lastCompletedReview,
    hasInProgress,
    pendingReviewCount,
    sessionStep,
    sessionTotalSteps,
    defaultLessonTitle: recentLesson?.title,
    childDisplayName,
  });

  function resumeSession() {
    navigation.navigate("Session", {
      forceNew: false,
      lessonId: sessionLessonId ?? recentLesson?.id,
      generationSource: undefined,
    });
  }

  function startResumableContent() {
    if (!resumableInput) {
      navigation.navigate("Home");
      return;
    }
    navigation.navigate("Session", {
      forceNew: true,
      lessonId: resumableInput.lessonId ?? "generated_dynamic",
      generationSource: resumableInput.source,
      contentInputId: resumableInput.id,
    });
  }

  function openReviewFocus() {
    navigation.navigate(
      "Review",
      firstPendingReview ? { focusReviewId: firstPendingReview.id } : undefined,
    );
  }

  function runParentJourneyAction(kind: ReturnType<typeof buildParentJourneyPresentation>["primaryAction"]["kind"] | ReturnType<typeof buildParentJourneyPresentation>["secondaryActionKind"]) {
    switch (kind) {
      case "resume_session":
        resumeSession();
        break;
      case "open_review_focus":
        openReviewFocus();
        break;
      case "start_content":
        startResumableContent();
        break;
      case "go_home":
        navigation.navigate("Home");
        break;
      case "open_review":
        navigation.navigate("Review");
        break;
      case "toggle_advanced":
        setShowAdvanced((prev) => !prev);
        break;
      default:
        break;
    }
  }
  const heroPrimaryAction = {
    label: parentJourney.primaryAction.label,
    onPress: () => runParentJourneyAction(parentJourney.primaryAction.kind),
  };
  const heroSpotlightLabel =
    parentJourney.primaryAction.kind === "resume_session"
      ? "当前正在进行"
      : parentJourney.primaryAction.kind === "open_review_focus"
        ? "下一步先做"
        : parentJourney.primaryAction.kind === "start_content"
          ? "已经安排好"
          : "现在先做";
  const heroSpotlightTitle =
    parentJourney.primaryAction.kind === "resume_session"
      ? `继续「${parentJourney.learningTitle}」`
      : parentJourney.primaryAction.kind === "open_review_focus"
        ? "先做 1 题温和复习"
        : parentJourney.primaryAction.kind === "start_content"
          ? `开始「${parentJourney.inputTitle}」`
          : "回首页拍不会的那一页";
  const heroSpotlightMeta =
    parentJourney.primaryAction.kind === "resume_session"
      ? `${parentJourney.learningMeta} · 学完后会自动接温和复习`
      : parentJourney.primaryAction.kind === "open_review_focus"
        ? firstPendingReview
          ? `从「${firstPendingReview.title}」开始，先把眼前这题收住`
          : parentJourney.reviewMeta
        : parentJourney.primaryAction.kind === "start_content"
          ? `${resumableInput?.routeLabel ?? "当前学习路线"} · 先做「${resumableInput?.recommendedEntryStep ?? "第一步"}」`
          : "首页拍一页后，系统会自动接住内容并安排学习路线";
  const journeySummaryText =
    parentJourney.currentJourneyStatus === "学习中"
      ? `${parentJourney.learningMeta}，从这里继续就行。`
      : parentJourney.currentJourneyStatus === "该复习了"
        ? `${parentJourney.reviewMeta}，现在最适合先复习眼前这一题。`
        : parentJourney.inputDone
          ? `${parentJourney.inputMeta} · 已经排好学习路线，下次打开也能从这里接上。`
          : "拍照或上传后，系统会自动把输入内容、开始学习和温和复习串成同一条主线。";
  const heroSecondaryAction = {
    label:
      parentJourney.secondaryActionKind === "toggle_advanced"
        ? showAdvanced
          ? "收起详细信息"
          : "看详细信息"
        : parentJourney.secondaryActionKind === "go_home"
          ? "回首页拍照"
          : "看复习页",
    onPress: () => runParentJourneyAction(parentJourney.secondaryActionKind),
  };

  function toggleDetailSection(section: keyof typeof expandedDetailSections) {
    setExpandedDetailSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  if (!progress || !report || !catalogQuery.data) {
    return (
      <ScreenErrorState
        title="学习概况暂无数据"
        message="请稍后刷新重试"
        onRetry={() => {
          catalogQuery.refetch();
          progressQuery.refetch();
          weeklyReportQuery.refetch();
        }}
      />
    );
  }

  const lessonFocusTag = activeLesson?.focusSkillTag ?? "main_idea";
  const lessonSuggestion =
    activeLesson?.parentSuggestion ??
    "建议优先训练主旨归纳：先说段意，再合并成完整中心句。";
  const canSaveSettings = Boolean(
    parentId &&
      parentSettings &&
      durationDraft != null &&
      reminderDraft &&
      (durationDraft !== parentSettings.studyDurationLimitMin ||
        reminderDraft !== parentSettings.reminderTime),
  );
  const refreshing =
    catalogQuery.isRefetching ||
    progressQuery.isRefetching ||
    weeklyReportQuery.isRefetching ||
    reviewQueueQuery.isRefetching ||
    (shouldLoadSettings && settingsQuery.isRefetching) ||
    consentRecordQuery.isRefetching;

  return (
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
          refreshing={Boolean(refreshing)}
          onRefresh={() => {
            catalogQuery.refetch();
            progressQuery.refetch();
            weeklyReportQuery.refetch();
            reviewQueueQuery.refetch();
            consentRecordQuery.refetch();
            if (shouldLoadSettings) {
              settingsQuery.refetch();
            }
          }}
          tintColor={colors.primary500}
          colors={[colors.primary500]}
        />
      }
    >
      <ParentHeroCard
        currentJourneyStatus={parentJourney.currentJourneyStatus}
        statusTone={parentJourney.statusTone}
        title={parentJourney.heroTitle}
        body={parentJourney.heroBody}
        spotlightLabel={heroSpotlightLabel}
        spotlightTitle={heroSpotlightTitle}
        spotlightMeta={heroSpotlightMeta}
        childGradeLabel={childGradeLabel}
        focusLabel={focusLabel}
        uploadedTextbookLabel={uploadedTextbookLabel}
        mascotState={parentJourney.mascotState as MascotState}
        mascotSpeech={parentJourney.heroSpeech}
        primaryAction={heroPrimaryAction}
        secondaryAction={heroSecondaryAction}
      />

      <ParentJourneyCard
        currentJourneyStatus={parentJourney.currentJourneyStatus}
        statusTone={parentJourney.statusTone}
        title={parentJourney.journeyCardTitle}
        summaryText={journeySummaryText}
        inputDone={parentJourney.inputDone}
        inputTitle={parentJourney.inputTitle}
        inputMeta={parentJourney.inputMeta}
        learningDone={parentJourney.learningDone}
        learningTitle={parentJourney.learningTitle}
        learningMeta={parentJourney.learningMeta}
        reviewDone={parentJourney.reviewDone}
        reviewTitle={parentJourney.reviewTitle}
        reviewMeta={parentJourney.reviewMeta}
      />

      {latestInput ? (
        <ParentLatestInputCard
          latestInput={latestInput}
          primaryActionLabel={
            parentJourney.primaryAction.kind === "resume_session" ? "继续当前学习" : "开始这份内容"
          }
          onPrimaryAction={
            parentJourney.primaryAction.kind === "resume_session" ? resumeSession : startResumableContent
          }
          onHomeAction={() => navigation.navigate("Home")}
        />
      ) : null}

      <ParentGrowthCard
        recitationCompletedCount={report.recitation.completedCount}
        masteredSkillLabels={progress.masteredTags.map((tag) => skillLabelMap[tag])}
        vocabUnknownRate={report.errorDistribution.vocab_unknown}
        evidenceMissedRate={report.errorDistribution.evidence_missed}
        mainIdeaOffRate={report.errorDistribution.main_idea_off}
      />

      <ParentMetricsGrid
        weeklyCompletedLessons={report.weeklyCompletedLessons}
        avgStudyMinutes={report.averageDurationMin}
        masteredCount={progress.masteredTags.length}
        pendingReviewCount={pendingReviewCount}
      />

      <ParentProfileCard
        childGradeLabel={childGradeLabel}
        childDisplayName={childDisplayName}
        focusLabel={focusLabel}
        uploadedTextbookLabel={uploadedTextbookLabel}
      />

      <AppCard style={styles.card}>
        <Text style={textStyles.title}>更多设置与数据</Text>
        <Text style={styles.meta}>第一页只保留状态和下一步；课程细节、家长设置、导出和删除都收在这里。</Text>
        <AppButton
          label={showAdvanced ? "收起更多内容" : "查看更多内容"}
          variant="secondary"
          onPress={() => setShowAdvanced((prev) => !prev)}
        />
      </AppCard>

      {showAdvanced ? (
        <>
          <ParentDetailSection
            title="内容安排"
            meta="课程进度、当前内容和继续学习入口"
            expanded={expandedDetailSections.content}
            onToggle={() => toggleDetailSection("content")}
          >
                <Text style={textStyles.meta}>学习内容进度概览</Text>
                <View style={styles.metaRow}>
                  {lessons.map((lesson, idx) => {
                    const status =
                      lesson.id === sessionLessonId && hasInProgress
                        ? "学习中"
                        : idx < safeCompletedLessons
                          ? "本周已学习"
                          : "待学习";
                    return (
                      <StatusChip
                        key={lesson.id}
                        label={`${lesson.title} · ${status}`}
                        tone={status === "学习中" ? "accent" : "primary"}
                      />
                    );
                  })}
                </View>
                <Text style={textStyles.meta}>学习内容详情与建议</Text>
                <View style={styles.lessonPicker}>
                  {lessons.map((lesson) => {
                    const active = lesson.id === activeLessonId;
                    return (
                      <Pressable
                        key={lesson.id}
                        style={[styles.lessonChip, active && styles.lessonChipActive]}
                        onPress={() => setSelectedLessonId(lesson.id)}
                      >
                        <Text style={[styles.lessonChipText, active && styles.lessonChipTextActive]}>
                          {lesson.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={textStyles.body}>当前内容：{activeLesson?.title ?? "暂无"}</Text>
                <StatusChip label={`重点能力：${skillLabelMap[lessonFocusTag]}`} tone="accent" />
                <Text style={styles.meta}>{lessonSuggestion}</Text>
                <View style={styles.actionButtons}>
                  <AppButton
                    label="开始该内容学习"
                    onPress={() => {
                      if (!activeLesson) return;
                      navigation.navigate("Session", {
                        forceNew: true,
                        lessonId: activeLesson.id,
                        generationSource: undefined,
                      });
                    }}
                    disabled={!activeLesson}
                  />
                  <AppButton
                    label="进入温和复习"
                    variant="secondary"
                    onPress={() => navigation.navigate("Review")}
                  />
                </View>
          </ParentDetailSection>

          <ParentDetailSection
            title="能力诊断"
            meta="错误分布、朗读稳定度和掌握能力点"
            expanded={expandedDetailSections.diagnosis}
            onToggle={() => toggleDetailSection("diagnosis")}
          >
                <Text style={textStyles.meta}>错误分布</Text>
                <View style={styles.metaRow}>
                  <StatusChip label={`字词没懂 ${Math.round(report.errorDistribution.vocab_unknown * 100)}%`} />
                  <StatusChip
                    label={`证据句没找到 ${Math.round(report.errorDistribution.evidence_missed * 100)}%`}
                    tone="accent"
                  />
                  <StatusChip label={`主旨偏差 ${Math.round(report.errorDistribution.main_idea_off * 100)}%`} />
                </View>
                <Text style={textStyles.meta}>朗读/背诵</Text>
                <Text style={textStyles.body}>本周完成：{report.recitation.completedCount} 次</Text>
                <View style={styles.metaRow}>
                  {report.recitation.unstableSegments.length > 0 ? (
                    report.recitation.unstableSegments.map((segmentId) => (
                      <StatusChip key={segmentId} label={recitationSegmentLabel(segmentId)} tone="accent" />
                    ))
                  ) : (
                    <StatusChip label="暂无不稳定片段" />
                  )}
                </View>
                <Text style={textStyles.meta}>掌握能力点</Text>
                <View style={styles.metaRow}>
                  {progress.masteredTags.length > 0 ? (
                    progress.masteredTags.map((tag) => (
                      <StatusChip key={tag} label={skillLabelMap[tag]} tone="primary" />
                    ))
                  ) : (
                    <StatusChip label="掌握能力点会在学习后出现" />
                  )}
                </View>
          </ParentDetailSection>

          <ParentDetailSection
            title="学习设置"
            meta="单次学习时长和提醒时间"
            expanded={expandedDetailSections.settings}
            onToggle={() => toggleDetailSection("settings")}
          >
                {!parentId || !parentSettings ? (
                  <Text style={styles.meta}>当前无可编辑家长设置</Text>
                ) : (
                  <>
                    <Text style={textStyles.meta}>学习时长上限</Text>
                    <View style={styles.lessonPicker}>
                      {durationLimitOptions.map((min) => {
                        const active = durationDraft === min;
                        return (
                          <Pressable
                            key={min}
                            style={[styles.lessonChip, active && styles.lessonChipActive]}
                            onPress={() => {
                              setDurationDraft(min);
                              setSettingsSaveMessage(null);
                              setSettingsSaveError(null);
                            }}
                          >
                            <Text style={[styles.lessonChipText, active && styles.lessonChipTextActive]}>
                              {min} 分钟
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Text style={textStyles.meta}>提醒时间</Text>
                    <View style={styles.lessonPicker}>
                      {reminderTimeOptions.map((time) => {
                        const active = reminderDraft === time;
                        return (
                          <Pressable
                            key={time}
                            style={[styles.lessonChip, active && styles.lessonChipActive]}
                            onPress={() => {
                              setReminderDraft(time);
                              setSettingsSaveMessage(null);
                              setSettingsSaveError(null);
                            }}
                          >
                            <Text style={[styles.lessonChipText, active && styles.lessonChipTextActive]}>
                              {time}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Text style={styles.meta}>
                      当前设置：单次学习不超过 {durationDraft ?? parentSettings.studyDurationLimitMin} 分钟，
                      每日提醒 {reminderDraft ?? parentSettings.reminderTime}
                    </Text>
                    {settingsSaveError ? <Text style={styles.error}>{settingsSaveError}</Text> : null}
                    {settingsSaveMessage ? <Text style={styles.success}>{settingsSaveMessage}</Text> : null}
                    <AppButton
                      label={settingsMutation.isPending ? "保存中..." : "保存家长设置"}
                      onPress={() => {
                        if (!parentId || durationDraft == null || !reminderDraft) {
                          return;
                        }
                        settingsMutation.mutate({
                          parentId,
                          studyDurationLimitMin: durationDraft,
                          reminderTime: reminderDraft,
                        });
                      }}
                      disabled={settingsMutation.isPending || !canSaveSettings}
                    />
                  </>
                )}
          </ParentDetailSection>

          <ParentDetailSection
            title="数据管理"
            meta="同意记录、导出和删除操作"
            expanded={expandedDetailSections.data}
            onToggle={() => toggleDetailSection("data")}
          >
                <Text style={styles.meta}>接口模式：{getApiModeLabel()}</Text>
                <Text style={textStyles.meta}>监护人同意记录</Text>
                {!parentId ? (
                  <Text style={styles.meta}>请先完成家长登录</Text>
                ) : consentRecordQuery.isLoading ? (
                  <Text style={styles.meta}>正在读取同意记录...</Text>
                ) : consentRecordQuery.isError ? (
                  <Text style={styles.meta}>
                    {toUserErrorMessage(consentRecordQuery.error, "同意记录加载失败")}
                  </Text>
                ) : consentRecordQuery.data ? (
                  <>
                    <Text style={styles.meta}>关系：{relationLabelMap[consentRecordQuery.data.relation]}</Text>
                    <Text style={styles.meta}>同意时间：{consentRecordQuery.data.agreedAt}</Text>
                    {consentRecordQuery.data.revokedAt ? (
                      <Text style={styles.meta}>撤回时间：{consentRecordQuery.data.revokedAt}</Text>
                    ) : null}
                    <Text style={styles.meta}>同意记录ID：{consentRecordQuery.data.consentId}</Text>
                  </>
                ) : (
                  <Text style={styles.meta}>暂无监护人同意记录</Text>
                )}
                <AppButton
                  label={consentRecordQuery.isFetching ? "刷新中..." : "刷新同意记录"}
                  variant="secondary"
                  onPress={() => {
                    if (!parentId) {
                      return;
                    }
                    consentRecordQuery.refetch();
                  }}
                  disabled={!parentId || consentRecordQuery.isFetching}
                />
                <AppButton
                  label={
                    revokeConsentMutation.isPending
                      ? "撤回中..."
                      : revokeConfirming
                        ? "确认撤回监护人同意"
                        : "撤回监护人同意"
                  }
                  variant="ghost"
                  onPress={() => {
                    if (!parentId) {
                      return;
                    }
                    if (!revokeConfirming) {
                      setRevokeConfirming(true);
                      setDeleteConfirming(false);
                      setDataManageError("再次点击“确认撤回监护人同意”后将退出当前账号并停止学习流程。");
                      return;
                    }
                    revokeConsentMutation.mutate({
                      parentId,
                    });
                  }}
                  disabled={!parentId || revokeConsentMutation.isPending}
                />
                {revokeConfirming && !revokeConsentMutation.isPending ? (
                  <AppButton
                    label="取消撤回"
                    variant="secondary"
                    onPress={() => {
                      setRevokeConfirming(false);
                      setDataManageError(null);
                    }}
                  />
                ) : null}
                {exportSummary ? <Text style={styles.meta}>{exportSummary}</Text> : null}
                {dataManageError ? <Text style={styles.error}>{dataManageError}</Text> : null}
                <AppButton
                  label={exportMutation.isPending ? "导出中..." : "导出学习数据"}
                  variant="secondary"
                  onPress={() => {
                    setDataManageError(null);
                    exportMutation.mutate();
                  }}
                  disabled={exportMutation.isPending || !parentId || !childId}
                />
                <AppButton
                  label={
                    deleteMutation.isPending
                      ? "删除中..."
                      : deleteConfirming
                        ? "确认删除孩子数据"
                        : "删除孩子数据"
                  }
                  variant="ghost"
                  onPress={() => {
                    if (!parentId || !childId) {
                      return;
                    }
                    if (!deleteConfirming) {
                      setDeleteConfirming(true);
                      setRevokeConfirming(false);
                      setDataManageError("再次点击“确认删除孩子数据”后将删除该孩子全部学习数据。");
                      return;
                    }
                    deleteMutation.mutate({
                      parentId,
                      childId,
                    });
                  }}
                  disabled={deleteMutation.isPending || !parentId || !childId}
                />
                {deleteConfirming && !deleteMutation.isPending ? (
                  <AppButton
                    label="取消删除"
                    variant="secondary"
                    onPress={() => {
                      setDeleteConfirming(false);
                      setDataManageError(null);
                    }}
                  />
                ) : null}
          </ParentDetailSection>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.pageHorizontal,
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  lessonPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  lessonChip: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bgCard,
  },
  lessonChipActive: {
    borderColor: colors.primary500,
    backgroundColor: colors.primary100,
  },
  lessonChipText: {
    ...textStyles.meta,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  lessonChipTextActive: {
    color: colors.primary500,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  meta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  error: {
    ...textStyles.caption,
    color: colors.error,
  },
  success: {
    ...textStyles.caption,
    color: colors.success,
  },
});
