import { Ionicons } from "@expo/vector-icons";
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
import { ParentHeroCard } from "../components/parent/ParentHeroCard";
import { ParentJourneyCard } from "../components/parent/ParentJourneyCard";
import { ParentLatestInputCard } from "../components/parent/ParentLatestInputCard";
import { StatusChip } from "../components/StatusChip";
import { ScreenErrorState } from "../components/states/ScreenErrorState";
import { ScreenLoadingState } from "../components/states/ScreenLoadingState";
import { ScreenOfflineState } from "../components/states/ScreenOfflineState";
import { colors, radius, shadow, spacing } from "../design/tokens";
import { layoutStyles, textStyles } from "../design/theme";
import { useCatalog } from "../hooks/useCatalog";
import { useGuardianConsentRecord } from "../hooks/useGuardianConsentRecord";
import { AppTabParamList } from "../navigation/types";
import { useProgressSummary } from "../hooks/useProgressSummary";
import { useParentSettings } from "../hooks/useParentSettings";
import { useReviewQueue } from "../hooks/useReviewQueue";
import { useWeeklyReport } from "../hooks/useWeeklyReport";
import { useAppState } from "../state/AppState";
import {
  getInputSourceLabel,
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

function MetricTile({
  icon,
  label,
  value,
  meta,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <View style={styles.metricTile}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={18} color={colors.primary600} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricMeta}>{meta}</Text>
    </View>
  );
}

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
    content: true,
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
    childProfile?.textbookVersion?.trim() || latestTextbookInput?.textbookVersion?.trim();
  const focusLabel = childProfile?.interests?.[0] ?? "综合";
  const childDisplayName = childProfile?.nickname ?? "孩子";
  const childGradeLabel = childProfile?.grade
    ? gradeLabelMap[childProfile.grade as keyof typeof gradeLabelMap] ?? childProfile.grade
    : "未设置年级";
  const pendingReviewItems = (reviewQueueQuery.data?.items ?? []).filter((item) => item.status === "pending");
  const pendingReviewCount = pendingReviewItems.length;
  const firstPendingReview = pendingReviewItems[0] ?? null;
  const journeyCompletedLearning = Boolean(journeySession?.completedAt || lastCompletedSession?.completedAt);
  const journeyLessonTitle =
    journeySession?.lessonTitle ?? lastCompletedSession?.lessonTitle ?? recentLesson?.title ?? "当前内容";
  const currentJourneyStatus = hasInProgress
    ? "学习中"
    : journeyCompletedLearning && pendingReviewCount > 0
      ? "该复习了"
      : resumableInput
        ? "已安排"
        : "待开始";
  const journeyStatusTone = hasInProgress || pendingReviewCount > 0 ? ("accent" as const) : ("primary" as const);

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

  const heroMascotState: MascotState = hasInProgress
    ? "teacher"
    : journeyCompletedLearning && pendingReviewCount > 0
      ? "encourage"
      : resumableInput
        ? "wow"
        : "happy";
  const heroSpeech = hasInProgress
    ? "这节课先学完"
    : journeyCompletedLearning && pendingReviewCount > 0
      ? "先稳稳复习一题"
      : resumableInput
        ? "这份内容已经排好了"
        : "拍一页，主线就开始";
  const heroTitle = hasInProgress
    ? "当前学习正在继续"
    : journeyCompletedLearning && pendingReviewCount > 0
      ? "今天先把这次复习收好"
      : resumableInput
        ? "这份内容已经准备好了"
        : "先拍一页，马上开始学";
  const heroBody = hasInProgress
    ? `${childDisplayName} 正在学「${journeyLessonTitle}」，还剩 ${Math.max(1, sessionTotalSteps - sessionStep)} 步。`
    : journeyCompletedLearning && pendingReviewCount > 0
      ? `刚学完「${journeyLessonTitle}」，现在最适合先做 ${pendingReviewCount} 项温和复习。`
      : resumableInput
        ? `基于「${resumableInput.title}」已经匹配${resumableInput.routeLabel}，随时都能从这里接上。`
        : "教材页、练习题、板书、图片都能拍；系统会识别内容并安排合适路线。";
  const heroPrimaryAction = hasInProgress
    ? { label: "继续学习", onPress: resumeSession }
    : journeyCompletedLearning && pendingReviewCount > 0
      ? { label: "去做温和复习", onPress: openReviewFocus }
      : resumableInput
        ? { label: "开始这份内容", onPress: startResumableContent }
        : { label: "回首页拍照", onPress: () => navigation.navigate("Home") };
  const heroSecondaryAction = hasInProgress
    ? { label: "回首页拍照", onPress: () => navigation.navigate("Home") }
    : pendingReviewCount > 0
      ? { label: "查看复习页", onPress: () => navigation.navigate("Review") }
      : { label: showAdvanced ? "收起详细设置" : "展开详细设置", onPress: () => setShowAdvanced((prev) => !prev) };

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
        currentJourneyStatus={currentJourneyStatus}
        statusTone={journeyStatusTone}
        title={heroTitle}
        body={heroBody}
        childGradeLabel={childGradeLabel}
        focusLabel={focusLabel}
        uploadedTextbookLabel={uploadedTextbookLabel}
        mascotState={heroMascotState}
        mascotSpeech={heroSpeech}
        primaryAction={heroPrimaryAction}
        secondaryAction={heroSecondaryAction}
      />

      <View style={styles.metricGrid}>
        <MetricTile icon="school-outline" label="本周学习" value={`${report.weeklyCompletedLessons}`} meta="次内容学习" />
        <MetricTile icon="time-outline" label="平均时长" value={`${report.averageDurationMin}`} meta="分钟 / 次" />
        <MetricTile icon="sparkles-outline" label="掌握能力" value={`${progress.masteredTags.length}`} meta="项已稳定" />
        <MetricTile icon="refresh-circle-outline" label="待复习" value={`${pendingReviewCount}`} meta="项温和巩固" />
      </View>

      <ParentJourneyCard
        currentJourneyStatus={currentJourneyStatus}
        statusTone={journeyStatusTone}
        title={
          hasInProgress
            ? `正在学「${journeyLessonTitle}」`
            : journeyCompletedLearning && pendingReviewCount > 0
              ? `「${journeyLessonTitle}」学完了，下一步先复习`
              : resumableInput
                ? `已收好「${resumableInput.title}」`
                : "还没有新的输入内容"
        }
        inputDone={Boolean(resumableInput)}
        inputTitle={resumableInput ? resumableInput.title : "拍照或上传后自动记录"}
        inputMeta={resumableInput ? getInputSourceLabel(resumableInput.source) : "等待开始"}
        learningDone={Boolean(hasInProgress || journeyCompletedLearning || resumableInput)}
        learningTitle={journeyLessonTitle}
        learningMeta={
          hasInProgress
            ? `第 ${sessionStep}/${sessionTotalSteps} 步`
            : journeyCompletedLearning
              ? "已完成"
              : resumableInput
                ? `${resumableInput.generatedTaskCount} 步任务`
                : "待开始"
        }
        reviewDone={Boolean(pendingReviewCount > 0 || lastCompletedReview)}
        reviewTitle={pendingReviewCount > 0 ? "今天先复习眼前这一题" : "学完后自动接上"}
        reviewMeta={
          pendingReviewCount > 0
            ? `${pendingReviewCount} 项待巩固`
            : lastCompletedReview
              ? `已完成 ${lastCompletedReview.completedCount} 题`
              : "暂未开始"
        }
      />

      <AppCard style={styles.profileCard}>
        <View style={styles.rowBetween}>
          <Text style={textStyles.title}>孩子档案</Text>
          <StatusChip label={childGradeLabel} tone="primary" />
        </View>
        <Text style={styles.profileName}>{childDisplayName}</Text>
        <View style={styles.metaRow}>
          <StatusChip label={`当前重点：${focusLabel}`} />
          {uploadedTextbookLabel ? <StatusChip label={`教材：${uploadedTextbookLabel}`} tone="accent" /> : null}
        </View>
        {!uploadedTextbookLabel ? (
          <Text style={styles.meta}>未上传教材时，不展示教材信息；上传练习题、板书或图片也能自动安排学习内容。</Text>
        ) : null}
      </AppCard>

      {latestInput ? (
        <ParentLatestInputCard
          latestInput={latestInput}
          primaryActionLabel={hasInProgress ? "继续当前学习" : "开始这份内容"}
          onPrimaryAction={hasInProgress ? resumeSession : startResumableContent}
          onHomeAction={() => navigation.navigate("Home")}
        />
      ) : null}

      <AppCard style={styles.growthCard}>
        <View style={styles.rowBetween}>
          <Text style={textStyles.title}>这周成长</Text>
          <StatusChip label={`${report.recitation.completedCount} 次朗读`} tone="primary" />
        </View>
        <Text style={styles.growthLead}>
          {progress.masteredTags.length > 0
            ? `已经稳定掌握 ${progress.masteredTags.length} 项能力，继续保持这个节奏。`
            : "刚开始建立学习节奏，先从拍一页开始就够了。"}
        </Text>
        <View style={styles.metaRow}>
          {progress.masteredTags.length > 0 ? (
            progress.masteredTags.slice(0, 4).map((tag) => (
              <StatusChip key={tag} label={skillLabelMap[tag]} tone="primary" />
            ))
          ) : (
            <StatusChip label="掌握能力会在学习后出现" />
          )}
        </View>
        <Text style={styles.meta}>
          高频问题：字词没懂 {Math.round(report.errorDistribution.vocab_unknown * 100)}% · 证据句没找到{" "}
          {Math.round(report.errorDistribution.evidence_missed * 100)}% · 主旨偏差{" "}
          {Math.round(report.errorDistribution.main_idea_off * 100)}%
        </Text>
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={textStyles.title}>详细设置与数据</Text>
        <Text style={styles.meta}>主页面只保留状态和下一步动作；课程细节、设置、数据管理都收在这里。</Text>
        <AppButton
          label={showAdvanced ? "收起详细信息" : "展开详细信息"}
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
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricTile: {
    minWidth: "47%",
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.sm,
    gap: spacing.xxs,
    ...shadow.card,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  metricLabel: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  metricValue: {
    ...textStyles.h2,
    color: colors.textPrimary,
    fontSize: 26,
    lineHeight: 30,
  },
  metricMeta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  profileCard: {
    gap: spacing.sm,
  },
  profileName: {
    ...textStyles.h2,
    color: colors.textPrimary,
    fontSize: 26,
    lineHeight: 30,
  },
  growthCard: {
    gap: spacing.sm,
  },
  growthLead: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  card: {
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
