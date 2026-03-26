import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../AppButton";
import { StatusChip } from "../StatusChip";
import { colors, radius, shadow, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface LearningActionDockProps {
  bottomInset: number;
  isLast: boolean;
  currentStepLabel: string;
  visibleTotalSteps: number;
  actionDockStatusLabel: string;
  actionDockTitle: string;
  actionDockMeta: string;
  isQuiz: boolean;
  showQuizRetryActions: boolean;
  showRecitationRetryActions: boolean;
  canGoNext: boolean;
  selectedOption: number | null;
  answerPending: boolean;
  onSubmitAnswer: () => void;
  onRetryQuiz: () => void;
  onRetryRecitation: () => void;
  onNext: () => void;
  onComplete: () => void;
  onPause: () => void;
  onRestart: () => void;
  showRestart: boolean;
}

export function LearningActionDock({
  bottomInset,
  isLast,
  currentStepLabel,
  visibleTotalSteps,
  actionDockStatusLabel,
  actionDockTitle,
  actionDockMeta,
  isQuiz,
  showQuizRetryActions,
  showRecitationRetryActions,
  canGoNext,
  selectedOption,
  answerPending,
  onSubmitAnswer,
  onRetryQuiz,
  onRetryRecitation,
  onNext,
  onComplete,
  onPause,
  onRestart,
  showRestart,
}: LearningActionDockProps) {
  return (
    <View style={[styles.actionDock, { paddingBottom: bottomInset }]}>
      <View style={styles.actionDockSurface}>
        <View style={styles.actionDockHeader}>
          <View style={styles.actionDockCopy}>
            <Text style={styles.actionDockEyebrow}>
              {isLast ? "最后一步" : `${currentStepLabel} · 共 ${visibleTotalSteps} 步`}
            </Text>
            <Text style={styles.actionDockTitle}>{actionDockTitle}</Text>
            <Text style={styles.actionDockMeta} numberOfLines={1}>
              {actionDockMeta}
            </Text>
          </View>
          <StatusChip label={actionDockStatusLabel} tone="accent" />
        </View>

        {isQuiz && !showQuizRetryActions ? (
          <AppButton
            label={answerPending ? "提交中..." : "提交答案"}
            onPress={onSubmitAnswer}
            disabled={selectedOption == null || answerPending}
          />
        ) : null}

        {showQuizRetryActions ? (
          <View style={styles.inlineActionRow}>
            <View style={styles.inlineActionCell}>
              <AppButton label="再试一次" onPress={onRetryQuiz} />
            </View>
            <View style={styles.inlineActionCell}>
              <AppButton label="先继续" onPress={onNext} variant="secondary" />
            </View>
          </View>
        ) : null}

        {showRecitationRetryActions ? (
          <View style={styles.inlineActionRow}>
            <View style={styles.inlineActionCell}>
              <AppButton label="再读一次" onPress={onRetryRecitation} />
            </View>
            <View style={styles.inlineActionCell}>
              <AppButton label="先继续" onPress={onNext} variant="secondary" />
            </View>
          </View>
        ) : null}

        {canGoNext && !isLast && !showQuizRetryActions && !showRecitationRetryActions ? (
          <AppButton label="下一步" onPress={onNext} />
        ) : null}

        {isLast ? <AppButton label="完成学习，返回首页" onPress={onComplete} /> : null}

        <View style={[styles.restartRow, !showRestart && styles.restartRowSingleAction]}>
          <Pressable hitSlop={8} onPress={onPause}>
            <Text style={styles.pauseText}>稍后继续</Text>
          </Pressable>
          {showRestart ? (
            <Pressable hitSlop={8} onPress={onRestart}>
              <Text style={styles.restartText}>重新开始本课</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.pageHorizontal,
    paddingTop: spacing.sm,
    backgroundColor: "rgba(250, 252, 249, 0.96)",
  },
  actionDockSurface: {
    borderRadius: radius.xl,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  actionDockHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  actionDockCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  actionDockEyebrow: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  actionDockTitle: {
    ...textStyles.title,
    fontSize: 18,
    lineHeight: 24,
  },
  actionDockMeta: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  inlineActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  inlineActionCell: {
    flex: 1,
  },
  restartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  restartRowSingleAction: {
    justifyContent: "flex-start",
  },
  pauseText: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  restartText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
});
