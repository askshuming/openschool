import { Ionicons } from "@expo/vector-icons";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
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
import { ReviewAnswerResponse, ReviewQueueItem } from "../api/contracts";
import { submitReviewAnswerApi } from "../api/service";
import { queryKeys } from "../api/queryKeys";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { FeedbackBox } from "../components/FeedbackBox";
import { MascotBuddy } from "../components/MascotBuddy";
import { ProgressHeader } from "../components/ProgressHeader";
import { StatusChip } from "../components/StatusChip";
import { ScreenEmptyState } from "../components/states/ScreenEmptyState";
import { ScreenErrorState } from "../components/states/ScreenErrorState";
import { ScreenLoadingState } from "../components/states/ScreenLoadingState";
import { ScreenOfflineState } from "../components/states/ScreenOfflineState";
import { colors, motion, radius, spacing } from "../design/tokens";
import { layoutStyles, textStyles } from "../design/theme";
import { useCatalog } from "../hooks/useCatalog";
import { useReviewQueue } from "../hooks/useReviewQueue";
import { AppTabParamList } from "../navigation/types";
import { useAppState } from "../state/AppState";
import { useLearningJourneyStore } from "../state/learningJourneyStore";
import { triggerFeedback } from "../utils/feedback";
import { isOfflineError, toUserErrorMessage } from "../utils/errorMessage";

type ReviewTab = "today" | "done";
type Props = BottomTabScreenProps<AppTabParamList, "Review">;
type PracticeMode = "idle" | "single" | "batch";
type CompletionSummary = {
  mode: "single" | "batch";
  completedCount: number;
  createdAt: string;
};

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

export function ReviewScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const practiceScrollRef = useRef<ScrollView>(null);
  const answerFeedbackKeyRef = useRef<string | null>(null);
  const summaryAnim = useRef(new Animated.Value(0)).current;
  const { childProfile, childId } = useAppState();
  const queryClient = useQueryClient();
  const recordReviewCompleted = useLearningJourneyStore((s) => s.recordReviewCompleted);
  const childKey = childId ?? childProfile?.nickname ?? "demo";
  const effectiveChildId = childId ?? (childProfile ? `child_${childProfile.nickname}` : "child_demo");
  const [tab, setTab] = useState<ReviewTab>("today");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("idle");
  const [practiceItems, setPracticeItems] = useState<ReviewQueueItem[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<ReviewAnswerResponse | null>(null);
  const [practiceSubmitError, setPracticeSubmitError] = useState<string | null>(null);
  const [practiceHint, setPracticeHint] = useState<string | null>(null);
  const [completionSummary, setCompletionSummary] = useState<CompletionSummary | null>(null);
  const [showQueueDetails, setShowQueueDetails] = useState(false);
  const reviewQueueQuery = useReviewQueue(childKey, effectiveChildId);
  const catalogQuery = useCatalog();
  const reviewAnswerMutation = useMutation({
    mutationFn: submitReviewAnswerApi,
  });
  const queueItems = reviewQueueQuery.data?.items ?? [];

  const todayPendingItems = useMemo(
    () => queueItems.filter((item) => item.status === "pending"),
    [queueItems],
  );
  const doneItems = useMemo(
    () => queueItems.filter((item) => item.status === "done"),
    [queueItems],
  );
  const nextPendingItem = todayPendingItems[0] ?? null;

  const list = useMemo(() => {
    if (tab === "today") {
      return queueItems.filter((item) => item.status === "pending");
    }
    return queueItems.filter((item) => item.status === "done");
  }, [queueItems, tab]);
  const currentPracticeItem =
    practiceMode === "idle" ? null : practiceItems[practiceIndex] ?? null;
  const currentQuestion = currentPracticeItem?.practice ?? null;
  const isPracticeLast = practiceMode !== "idle" && practiceIndex >= practiceItems.length - 1;
  const showPracticeRetryActions = Boolean(answerResult && !answerResult.correct);
  const focusReviewId = route.params?.focusReviewId;

  useEffect(() => {
    if (practiceMode !== "idle" && (!currentPracticeItem || !currentQuestion)) {
      setPracticeMode("idle");
      setPracticeItems([]);
      setPracticeIndex(0);
      setSelectedOption(null);
      setAnswerResult(null);
      setPracticeSubmitError(null);
    }
  }, [currentPracticeItem, currentQuestion, practiceMode]);

  useEffect(() => {
    if (!focusReviewId || practiceMode !== "idle") {
      return;
    }
    const target = queueItems.find((item) => item.id === focusReviewId);
    if (!target) {
      return;
    }
    setTab("today");
    startSinglePractice(target);
    navigation.setParams({ focusReviewId: undefined });
  }, [focusReviewId, navigation, practiceMode, queueItems]);

  useEffect(() => {
    if (practiceMode !== "idle") {
      return;
    }
    setShowQueueDetails(false);
  }, [practiceMode, tab]);

  useEffect(() => {
    if (!answerResult || !currentPracticeItem) {
      return;
    }
    const feedbackKey = `${currentPracticeItem.id}:${practiceIndex}:${answerResult.correct ? "1" : "0"}`;
    if (answerFeedbackKeyRef.current === feedbackKey) {
      return;
    }
    answerFeedbackKeyRef.current = feedbackKey;
    triggerFeedback(answerResult.correct ? "success" : "error");
    setTimeout(() => {
      practiceScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, [answerResult, currentPracticeItem, practiceIndex]);

  function resetPracticeStep() {
    setSelectedOption(null);
    setAnswerResult(null);
    setPracticeSubmitError(null);
    setPracticeHint(null);
    answerFeedbackKeyRef.current = null;
  }

  function startSinglePractice(item: ReviewQueueItem) {
    setCompletionSummary(null);
    setPracticeMode("single");
    setPracticeItems([item]);
    setPracticeIndex(0);
    resetPracticeStep();
  }

  function startBatchPractice() {
    setCompletionSummary(null);
    if (todayPendingItems.length === 0) {
      navigation.navigate("Home");
      return;
    }
    setPracticeMode("batch");
    setPracticeItems(todayPendingItems);
    setPracticeIndex(0);
    resetPracticeStep();
  }

  function exitPractice() {
    setPracticeMode("idle");
    setPracticeItems([]);
    setPracticeIndex(0);
    resetPracticeStep();
  }

  function skipCurrentPracticeItem() {
    if (practiceMode !== "batch" || !currentPracticeItem || answerResult) {
      return;
    }
    if (practiceItems.length <= 1) {
      return;
    }
    const currentIndex = practiceIndex;
    const total = practiceItems.length;
    trackEvent("review_item_skipped", {
      mode: "batch",
      reviewId: currentPracticeItem.id,
      step: currentIndex + 1,
      totalSteps: total,
    });
    setPracticeItems((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      const next = [...prev];
      const [item] = next.splice(currentIndex, 1);
      if (!item) {
        return prev;
      }
      next.push(item);
      return next;
    });
    setPracticeIndex(currentIndex >= total - 1 ? 0 : currentIndex);
    resetPracticeStep();
    setPracticeHint("本题已后移到队尾，可稍后再做。");
  }

  async function submitPracticeAnswer() {
    if (!currentQuestion || selectedOption == null) return;
    if (!currentPracticeItem) return;
    setPracticeSubmitError(null);
    try {
      const result = await reviewAnswerMutation.mutateAsync({
        childId: effectiveChildId,
        reviewId: currentPracticeItem.id,
        selectedIndex: selectedOption,
      });
      setAnswerResult(result);
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.reviewQueue(), childKey],
      });
    } catch (error) {
      setPracticeSubmitError(toUserErrorMessage(error, "判题失败，请重试。"));
    }
  }

  function completeCurrentAndGoNext() {
    if (!currentPracticeItem) return;

    if (!isPracticeLast) {
      setPracticeIndex((prev) => prev + 1);
      resetPracticeStep();
      return;
    }

    const completedMode = practiceMode === "batch" ? "batch" : "single";
    const completedAt = new Date().toISOString();
    trackEvent("review_completed", {
      mode: completedMode,
      completedCount: practiceItems.length,
    });
    triggerFeedback("success");
    recordReviewCompleted({
      mode: completedMode,
      completedCount: practiceItems.length,
      completedAt,
    });
    setCompletionSummary({
      mode: completedMode,
      completedCount: practiceItems.length,
      createdAt: completedAt,
    });
    summaryAnim.setValue(0);
    Animated.timing(summaryAnim, {
      toValue: 1,
      duration: motion.normal,
      useNativeDriver: true,
    }).start();
    exitPractice();
    setTab("today");
  }

  if (reviewQueueQuery.isLoading) {
    return <ScreenLoadingState text="正在加载复习队列..." />;
  }

  if (reviewQueueQuery.isError) {
    if (isOfflineError(reviewQueueQuery.error)) {
      return (
        <ScreenOfflineState
          title="复习页离线中"
          message="网络恢复后可查看今日复习队列。"
          onRetry={() => reviewQueueQuery.refetch()}
        />
      );
    }
    return (
      <ScreenErrorState
        title="复习队列加载失败"
        message={toUserErrorMessage(reviewQueueQuery.error, "请稍后重试")}
        onRetry={() => reviewQueueQuery.refetch()}
      />
    );
  }

  if (practiceMode !== "idle" && currentPracticeItem && currentQuestion) {
    return (
      <ScrollView
        ref={practiceScrollRef}
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
      >
        <ProgressHeader
          lessonTitle={practiceMode === "batch" ? "今日复习" : "快速复习"}
          currentStep={practiceIndex + 1}
          totalSteps={practiceItems.length}
        />

        <View style={styles.rowTop}>
          <StatusChip label={typeLabelMap[currentPracticeItem.targetType]} tone="primary" />
          <View style={styles.practiceActions}>
            {practiceMode === "batch" && practiceItems.length > 1 && !answerResult ? (
              <Pressable hitSlop={8} onPress={skipCurrentPracticeItem}>
                <Text style={styles.linkMuted}>跳过本题</Text>
              </Pressable>
            ) : null}
            <Pressable hitSlop={8} onPress={exitPractice}>
              <Text style={styles.link}>返回队列</Text>
            </Pressable>
          </View>
        </View>
        {practiceHint ? <Text style={styles.hintText}>{practiceHint}</Text> : null}

        <AppCard style={styles.itemCard}>
          <Text style={textStyles.title}>{currentPracticeItem.title}</Text>
          <Text style={styles.cardText}>{currentQuestion.stem}</Text>
          <View style={styles.optionWrap}>
            {currentQuestion.options.map((option, idx) => {
              const active = selectedOption === idx;
              return (
                <Pressable
                  key={`${currentPracticeItem.id}_${option}`}
                  onPress={() => {
                    if (!answerResult) {
                      setSelectedOption(idx);
                    }
                  }}
                  style={[styles.option, active && styles.optionActive]}
                >
                  <Text style={[textStyles.body, active && styles.optionTextActive]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </AppCard>

        {!answerResult ? (
          <AppButton
            label={reviewAnswerMutation.isPending ? "判题中..." : "提交答案"}
            onPress={() => {
              submitPracticeAnswer();
            }}
            disabled={selectedOption == null || reviewAnswerMutation.isPending}
          />
        ) : (
          <>
            <FeedbackBox
              isCorrect={answerResult.correct}
              message={answerResult.feedback.message}
              evidence={answerResult.feedback.evidence}
            />
            {showPracticeRetryActions ? (
              <View style={styles.practiceActionRow}>
                <View style={styles.practiceActionCell}>
                  <AppButton label="再做一次" onPress={resetPracticeStep} />
                </View>
                <View style={styles.practiceActionCell}>
                  <AppButton
                    label={isPracticeLast ? "先完成复习" : "先继续"}
                    onPress={() => {
                      completeCurrentAndGoNext();
                    }}
                    variant="secondary"
                  />
                </View>
              </View>
            ) : (
              <AppButton
                label={isPracticeLast ? "完成复习" : "下一题"}
                onPress={() => {
                  completeCurrentAndGoNext();
                }}
              />
            )}
          </>
        )}
        {practiceSubmitError ? <Text style={styles.errorText}>{practiceSubmitError}</Text> : null}
      </ScrollView>
    );
  }

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
          refreshing={reviewQueueQuery.isRefetching || catalogQuery.isRefetching}
          onRefresh={() => {
            reviewQueueQuery.refetch();
            catalogQuery.refetch();
          }}
          tintColor={colors.primary500}
          colors={[colors.primary500]}
        />
      }
    >
      <AppCard style={styles.reviewHeroCard}>
        <View style={styles.reviewHeroInner}>
          <MascotBuddy
            state={todayPendingItems.length > 0 ? "teacher" : "happy"}
            size={92}
            speech={todayPendingItems.length > 0 ? "今天先做一题就够了" : "今天的复习已经完成啦"}
          />
          <View style={styles.reviewHeroCopy}>
            <View style={styles.rowTop}>
              <Text style={textStyles.h2}>温和复习</Text>
              <StatusChip
                label={todayPendingItems.length > 0 ? `${todayPendingItems.length} 待复习` : "已清空"}
                tone={todayPendingItems.length > 0 ? "accent" : "primary"}
              />
            </View>
            <Text style={styles.cardText}>
              {todayPendingItems.length > 0
                ? "不用一次做完。先复习眼前这一题，系统会自动继续安排。"
                : "今天需要巩固的内容已经清空。下一次学习建议从首页拍照进入。"}
            </Text>
            {nextPendingItem ? (
              <View style={styles.reviewFocusWrap}>
                <View style={styles.reviewFocusHeader}>
                  <Text style={styles.reviewFocusEyebrow}>今天最该先做</Text>
                  <View style={styles.reviewFocusChipRow}>
                    <StatusChip label={typeLabelMap[nextPendingItem.targetType]} tone="primary" />
                    <StatusChip label={difficultyLabelMap[nextPendingItem.difficulty]} />
                  </View>
                </View>
                <Text style={styles.reviewFocusTitle}>{nextPendingItem.title}</Text>
                <Text style={styles.reviewFocusMeta}>
                  到期：{dueTextMap[nextPendingItem.dueAt]} · 做完这题，系统会判断下一题要不要继续做
                </Text>
              </View>
            ) : (
              <View style={styles.reviewFocusWrap}>
                <Text style={styles.reviewFocusEyebrow}>今天的结果</Text>
                <Text style={styles.reviewFocusTitle}>
                  已完成 {doneItems.length} 项复习，今天先到这里就可以。
                </Text>
                <Text style={styles.reviewFocusMeta}>
                  如果还想继续推进新内容，直接回首页拍一页。
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.reviewHeroActionRow}>
          <View style={styles.reviewHeroActionCell}>
            <AppButton
              label={todayPendingItems.length > 0 ? "马上复习这一题" : "回首页拍照"}
              onPress={
                todayPendingItems.length > 0 && nextPendingItem
                  ? () => startSinglePractice(nextPendingItem)
                  : () => navigation.navigate("Home")
              }
            />
          </View>
          <View style={styles.reviewHeroActionCell}>
            <AppButton
              label={todayPendingItems.length > 1 ? `连续复习 ${todayPendingItems.length} 题` : "查看队列和历史"}
              onPress={
                todayPendingItems.length > 1
                  ? startBatchPractice
                  : () => {
                      if (todayPendingItems.length === 0 && doneItems.length > 0) {
                        setTab("done");
                      }
                      setShowQueueDetails((prev) => !prev);
                    }
              }
              variant="secondary"
            />
          </View>
        </View>
      </AppCard>

      {completionSummary ? (
        <Animated.View
          style={[
            styles.summaryWrap,
            {
              opacity: summaryAnim,
              transform: [
                {
                  translateY: summaryAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <AppCard style={[styles.itemCard, styles.summaryCard]}>
            <View style={styles.summaryCardInner}>
              <MascotBuddy
                state="teacher"
                size={88}
                speech={completionSummary.mode === "batch" ? "今天的巩固完成了" : "这次复习很稳"}
              />
              <View style={styles.summaryCopy}>
                <View style={styles.rowTop}>
                  <Text style={textStyles.title}>复习完成</Text>
                  <StatusChip tone="accent" label="已达成" />
                </View>
                <Text style={styles.cardText}>
                  {completionSummary.mode === "batch"
                    ? `你已完成今天复习，共 ${completionSummary.completedCount} 题。`
                    : "你已完成一次快速复习。"}
                </Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <Pressable hitSlop={8} onPress={() => setCompletionSummary(null)}>
                <Text style={styles.link}>收起提示</Text>
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  navigation.navigate("Home", {
                    reviewCompletedAt: completionSummary.createdAt,
                    reviewCompletedCount: completionSummary.completedCount,
                    reviewCompletedMode: completionSummary.mode,
                  });
                  setCompletionSummary(null);
                }}
              >
                <Text style={styles.link}>回首页拍照</Text>
              </Pressable>
            </View>
          </AppCard>
          </Animated.View>
      ) : null}

      <Pressable
        hitSlop={8}
        onPress={() => setShowQueueDetails((prev) => !prev)}
        style={({ pressed }) => [styles.queueDisclosure, pressed && styles.queueDisclosurePressed]}
      >
        <View style={styles.queueDisclosureCopy}>
          <Text style={styles.queueDisclosureTitle}>
            {showQueueDetails ? "收起复习队列与历史" : "查看复习队列与历史"}
          </Text>
          <Text style={styles.queueDisclosureMeta}>
            {todayPendingItems.length > 0
              ? `待复习 ${todayPendingItems.length} 项，已完成 ${doneItems.length} 项`
              : doneItems.length > 0
                ? `今天已完成 ${doneItems.length} 项复习，记录都收在这里`
                : "默认先把注意力留给眼前这一题"}
          </Text>
        </View>
        <Ionicons
          name={showQueueDetails ? "chevron-up-outline" : "chevron-down-outline"}
          size={18}
          color={colors.primary500}
        />
      </Pressable>

      {showQueueDetails ? (
        <>
          <View style={styles.segment}>
            <Pressable
              hitSlop={8}
              onPress={() => setTab("today")}
              style={[styles.segmentBtn, tab === "today" && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, tab === "today" && styles.segmentTextActive]}>今日待复习</Text>
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() => setTab("done")}
              style={[styles.segmentBtn, tab === "done" && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, tab === "done" && styles.segmentTextActive]}>已完成</Text>
            </Pressable>
          </View>

          <View style={styles.queueSectionHead}>
            <Text style={styles.queueSectionTitle}>{tab === "today" ? "手动查看复习队列" : "最近完成记录"}</Text>
            <Text style={styles.queueSectionMeta}>
              {tab === "today"
                ? list.length > 0
                  ? `共 ${list.length} 项待巩固`
                  : "当前没有待复习内容"
                : list.length > 0
                  ? `共 ${list.length} 项已完成`
                  : "完成后会出现在这里"}
            </Text>
          </View>

          <View style={styles.list}>
            {list.length === 0 ? (
              <ScreenEmptyState
                title={tab === "today" ? "今天没有待复习内容" : "暂无已完成复习"}
                message={tab === "today" ? "可以回首页拍照生成新的学习内容。" : "完成后会在这里看到历史记录。"}
                actionLabel={tab === "today" ? "回首页拍照" : undefined}
                onAction={
                  tab === "today"
                    ? () =>
                        navigation.navigate("Home")
                    : undefined
                }
              />
            ) : (
              list.map((item) => (
                <AppCard key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={textStyles.title}>{item.title}</Text>
                    <StatusChip label={difficultyLabelMap[item.difficulty]} tone="primary" />
                  </View>
                  <View style={styles.row}>
                    <StatusChip label={typeLabelMap[item.targetType]} />
                    <Text style={textStyles.meta}>到期：{dueTextMap[item.dueAt]}</Text>
                  </View>
                  <View style={styles.actionRow}>
                    <StatusChip label={item.status === "pending" ? "待巩固" : "已完成"} />
                    <Pressable hitSlop={8} onPress={() => startSinglePractice(item)}>
                      <Text style={styles.link}>{item.status === "pending" ? "快速复习" : "再练一次"}</Text>
                    </Pressable>
                  </View>
                </AppCard>
              ))
            )}
          </View>
        </>
      ) : null}

      {tab === "today" && todayPendingItems.length === 0 ? (
        <AppCard style={styles.itemCard}>
          <Text style={textStyles.title}>下一步去做什么</Text>
          <Text style={styles.cardText}>
            复习完成后，不需要再找内容。回首页拍一页，系统会直接生成新的个性化学习任务。
          </Text>
          <AppButton label="回首页拍照" onPress={() => navigation.navigate("Home")} />
        </AppCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.pageHorizontal,
    gap: spacing.md,
  },
  reviewHeroCard: {
    gap: spacing.sm,
  },
  reviewHeroInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  reviewHeroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  reviewFocusWrap: {
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  reviewFocusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  reviewFocusChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  reviewFocusEyebrow: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  reviewFocusTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  reviewFocusMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  reviewHeroActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  reviewHeroActionCell: {
    flex: 1,
  },
  segment: {
    backgroundColor: colors.primary50,
    borderRadius: radius.md,
    padding: spacing.xs,
    flexDirection: "row",
    gap: spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: {
    backgroundColor: colors.bgCard,
  },
  segmentText: {
    ...textStyles.meta,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: colors.textPrimary,
  },
  list: {
    gap: spacing.sm,
  },
  queueDisclosure: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    padding: spacing.sm,
  },
  queueDisclosurePressed: {
    opacity: 0.92,
  },
  queueDisclosureCopy: {
    flex: 1,
    gap: 2,
  },
  queueDisclosureTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  queueDisclosureMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  queueSectionHead: {
    gap: 2,
  },
  queueSectionTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  queueSectionMeta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  focusCard: {
    gap: spacing.xs,
  },
  itemCard: {
    gap: spacing.sm,
  },
  practiceActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  practiceActionCell: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  link: {
    ...textStyles.meta,
    color: colors.primary500,
  },
  cardText: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  errorText: {
    ...textStyles.caption,
    color: colors.error,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  practiceActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  linkMuted: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  hintText: {
    ...textStyles.caption,
    color: colors.textTertiary,
    marginTop: -spacing.xs,
  },
  optionWrap: {
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  option: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: "#F8FBF9",
    padding: spacing.md,
  },
  optionActive: {
    borderColor: colors.primary500,
    backgroundColor: colors.primary100,
  },
  optionTextActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  summaryWrap: {
    marginTop: spacing.xs,
  },
  summaryCard: {
    borderColor: colors.accent500,
    borderWidth: 1,
    backgroundColor: colors.accent100,
  },
  summaryCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  summaryCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});
