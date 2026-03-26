import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
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
import { ReviewCompletionCard, ReviewCompletionSummary } from "../components/review/ReviewCompletionCard";
import { ReviewHeroCard } from "../components/review/ReviewHeroCard";
import { ReviewPracticeStage } from "../components/review/ReviewPracticeStage";
import { ReviewQueuePanel } from "../components/review/ReviewQueuePanel";
import { ScreenErrorState } from "../components/states/ScreenErrorState";
import { ScreenLoadingState } from "../components/states/ScreenLoadingState";
import { ScreenOfflineState } from "../components/states/ScreenOfflineState";
import { colors, motion, spacing } from "../design/tokens";
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
  const [completionSummary, setCompletionSummary] = useState<ReviewCompletionSummary | null>(null);
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
    const remainingPendingCount =
      completedMode === "batch"
        ? Math.max(
            0,
            todayPendingItems.filter((item) => !practiceItems.some((doneItem) => doneItem.id === item.id)).length,
          )
        : Math.max(0, todayPendingItems.filter((item) => item.id !== currentPracticeItem.id).length);
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
      remainingPendingCount,
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

  function openQueueDetails() {
    if (todayPendingItems.length === 0 && doneItems.length > 0) {
      setTab("done");
    }
    setShowQueueDetails(true);
  }

  function continueAfterCompletion() {
    const nextItem = (reviewQueueQuery.data?.items ?? []).find((item) => item.status === "pending") ?? null;
    setCompletionSummary(null);
    if (nextItem) {
      setTab("today");
      startSinglePractice(nextItem);
      return;
    }
    navigation.navigate("Home");
  }

  function navigateHomeAfterCompletion(summary: ReviewCompletionSummary) {
    navigation.navigate("Home", {
      reviewCompletedAt: summary.createdAt,
      reviewCompletedCount: summary.completedCount,
      reviewCompletedMode: summary.mode,
    });
    setCompletionSummary(null);
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
      <ReviewPracticeStage
        topInset={insets.top}
        bottomInset={insets.bottom}
        practiceMode={practiceMode}
        practiceIndex={practiceIndex}
        practiceItems={practiceItems}
        currentPracticeItem={currentPracticeItem}
        currentQuestion={currentQuestion}
        selectedOption={selectedOption}
        answerResult={answerResult}
        practiceHint={practiceHint}
        practiceSubmitError={practiceSubmitError}
        answerPending={reviewAnswerMutation.isPending}
        isPracticeLast={isPracticeLast}
        showRetryActions={showPracticeRetryActions}
        scrollRef={practiceScrollRef}
        onSelectOption={setSelectedOption}
        onSkip={skipCurrentPracticeItem}
        onExit={exitPractice}
        onSubmit={submitPracticeAnswer}
        onRetry={resetPracticeStep}
        onContinue={completeCurrentAndGoNext}
      />
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
      <ReviewHeroCard
        pendingCount={todayPendingItems.length}
        doneCount={doneItems.length}
        nextPendingItem={nextPendingItem}
        primaryActionLabel={todayPendingItems.length > 0 ? "先做这一题" : "回首页拍照"}
        secondaryActionLabel={todayPendingItems.length > 1 ? `继续做剩下 ${todayPendingItems.length} 题` : "看完整复习清单"}
        onPrimaryAction={
          todayPendingItems.length > 0 && nextPendingItem
            ? () => startSinglePractice(nextPendingItem)
            : () => navigation.navigate("Home")
        }
        onSecondaryAction={todayPendingItems.length > 1 ? startBatchPractice : openQueueDetails}
      />

      {completionSummary ? (
        <ReviewCompletionCard
          summary={completionSummary}
          summaryAnim={summaryAnim}
          primaryActionLabel={
            completionSummary.remainingPendingCount > 0
              ? `再收下一题（还剩 ${completionSummary.remainingPendingCount} 题）`
              : "今天先收好"
          }
          onPrimaryAction={continueAfterCompletion}
          onDismiss={() => setCompletionSummary(null)}
          onBackHome={() => navigateHomeAfterCompletion(completionSummary)}
        />
      ) : null}

      <ReviewQueuePanel
        showQueueDetails={showQueueDetails}
        tab={tab}
        todayPendingCount={todayPendingItems.length}
        doneCount={doneItems.length}
        list={list}
        onToggle={() => setShowQueueDetails((prev) => !prev)}
        onTabChange={setTab}
        onPracticeItem={startSinglePractice}
        onNavigateHome={() => navigation.navigate("Home")}
      />

      {tab === "today" && todayPendingItems.length === 0 ? (
        <AppCard style={styles.itemCard}>
          <Text style={textStyles.title}>今天的复习已经收好了</Text>
          <Text style={styles.cardText}>
            不用再找内容。回首页拍一页，系统会直接接上新的学习路线。
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
  itemCard: {
    gap: spacing.sm,
  },
  cardText: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
});
