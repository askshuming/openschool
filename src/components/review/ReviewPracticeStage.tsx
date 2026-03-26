import { RefObject } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ReviewAnswerResponse, ReviewQueueItem } from "../../api/contracts";
import { AppButton } from "../AppButton";
import { AppCard } from "../AppCard";
import { FeedbackBox } from "../FeedbackBox";
import { ProgressHeader } from "../ProgressHeader";
import { StatusChip } from "../StatusChip";
import { colors, radius, spacing } from "../../design/tokens";
import { layoutStyles, textStyles } from "../../design/theme";
import { getReviewTypeLabel } from "../../domain/reviewPresentation";

interface ReviewPracticeStageProps {
  topInset: number;
  bottomInset: number;
  practiceMode: "single" | "batch";
  practiceIndex: number;
  practiceItems: ReviewQueueItem[];
  currentPracticeItem: ReviewQueueItem;
  currentQuestion: ReviewQueueItem["practice"];
  selectedOption: number | null;
  answerResult: ReviewAnswerResponse | null;
  practiceHint: string | null;
  practiceSubmitError: string | null;
  answerPending: boolean;
  isPracticeLast: boolean;
  showRetryActions: boolean;
  scrollRef: RefObject<ScrollView | null>;
  onSelectOption: (index: number) => void;
  onSkip: () => void;
  onExit: () => void;
  onSubmit: () => void;
  onRetry: () => void;
  onContinue: () => void;
}

export function ReviewPracticeStage({
  topInset,
  bottomInset,
  practiceMode,
  practiceIndex,
  practiceItems,
  currentPracticeItem,
  currentQuestion,
  selectedOption,
  answerResult,
  practiceHint,
  practiceSubmitError,
  answerPending,
  isPracticeLast,
  showRetryActions,
  scrollRef,
  onSelectOption,
  onSkip,
  onExit,
  onSubmit,
  onRetry,
  onContinue,
}: ReviewPracticeStageProps) {
  return (
    <ScrollView
      ref={scrollRef}
      style={layoutStyles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: spacing.sm + topInset,
          paddingBottom: spacing.xxl + Math.max(bottomInset, spacing.md),
        },
      ]}
      contentInsetAdjustmentBehavior="never"
      scrollIndicatorInsets={{
        top: topInset,
        bottom: Math.max(bottomInset, spacing.md),
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
        <StatusChip label={getReviewTypeLabel(currentPracticeItem.targetType)} tone="primary" />
        <View style={styles.practiceActions}>
          {practiceMode === "batch" && practiceItems.length > 1 && !answerResult ? (
            <Pressable hitSlop={8} onPress={onSkip}>
              <Text style={styles.linkMuted}>跳过本题</Text>
            </Pressable>
          ) : null}
          <Pressable hitSlop={8} onPress={onExit}>
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
                    onSelectOption(idx);
                  }
                }}
                style={[styles.option, active && styles.optionActive]}
              >
                <Text style={[textStyles.body, active && styles.optionTextActive]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      {!answerResult ? (
        <AppButton
          label={answerPending ? "判题中..." : "提交答案"}
          onPress={onSubmit}
          disabled={selectedOption == null || answerPending}
        />
      ) : (
        <>
          <FeedbackBox
            isCorrect={answerResult.correct}
            message={answerResult.feedback.message}
            evidence={answerResult.feedback.evidence}
          />
          {showRetryActions ? (
            <View style={styles.practiceActionRow}>
              <View style={styles.practiceActionCell}>
                <AppButton label="再做一次" onPress={onRetry} />
              </View>
              <View style={styles.practiceActionCell}>
                <AppButton label={isPracticeLast ? "先完成复习" : "先继续"} onPress={onContinue} variant="secondary" />
              </View>
            </View>
          ) : (
            <AppButton label={isPracticeLast ? "完成复习" : "下一题"} onPress={onContinue} />
          )}
        </>
      )}
      {practiceSubmitError ? <Text style={styles.errorText}>{practiceSubmitError}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.pageHorizontal,
    gap: spacing.md,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  practiceActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  link: {
    ...textStyles.meta,
    color: colors.primary500,
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
  itemCard: {
    gap: spacing.sm,
  },
  cardText: {
    ...textStyles.body,
    color: colors.textSecondary,
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
  practiceActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  practiceActionCell: {
    flex: 1,
  },
  errorText: {
    ...textStyles.caption,
    color: colors.error,
  },
});
