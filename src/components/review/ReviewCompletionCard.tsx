import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../AppButton";
import { AppCard } from "../AppCard";
import { MascotBuddy } from "../MascotBuddy";
import { StatusChip } from "../StatusChip";
import { colors, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

export interface ReviewCompletionSummary {
  mode: "single" | "batch";
  completedCount: number;
  remainingPendingCount: number;
  createdAt: string;
}

interface ReviewCompletionCardProps {
  summary: ReviewCompletionSummary;
  summaryAnim: Animated.Value;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  onDismiss: () => void;
  onBackHome: () => void;
}

export function ReviewCompletionCard({
  summary,
  summaryAnim,
  primaryActionLabel,
  onPrimaryAction,
  onDismiss,
  onBackHome,
}: ReviewCompletionCardProps) {
  const title =
    summary.remainingPendingCount > 0
      ? "这一轮已经收住了"
      : "这次复习已经收好了";
  const body =
    summary.mode === "batch"
      ? summary.remainingPendingCount > 0
        ? `刚刚已经稳稳复习了 ${summary.completedCount} 题，今天还剩 ${summary.remainingPendingCount} 题。`
        : `刚刚已经稳稳复习了 ${summary.completedCount} 题，今天的复习先到这里。`
      : summary.remainingPendingCount > 0
        ? `这一题已经复习稳了，今天还剩 ${summary.remainingPendingCount} 题可继续收。`
        : "这一题已经复习稳了，今天的复习先到这里。";

  return (
    <Animated.View
      style={[
        styles.wrap,
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
      <AppCard style={[styles.card, styles.summaryCard]}>
        <View style={styles.summaryCardInner}>
          <MascotBuddy
            state="happy"
            size={88}
            speech={summary.remainingPendingCount > 0 ? "还可以再稳一题" : "今天的复习先收好了"}
          />
          <View style={styles.summaryCopy}>
            <View style={styles.rowTop}>
              <Text style={textStyles.title}>{title}</Text>
              <StatusChip tone="accent" label="已达成" />
            </View>
            <Text style={styles.body}>{body}</Text>
          </View>
        </View>
        <View style={styles.ctaWrap}>
          <AppButton label={primaryActionLabel} onPress={onPrimaryAction} />
          <AppButton label="回首页拍新内容" onPress={onBackHome} variant="secondary" />
        </View>
        <View style={styles.actionRow}>
          <Pressable hitSlop={8} onPress={onDismiss}>
            <Text style={styles.link}>收起提示</Text>
          </Pressable>
        </View>
      </AppCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xs,
  },
  card: {
    gap: spacing.sm,
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
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  body: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  ctaWrap: {
    gap: spacing.xs,
  },
  link: {
    ...textStyles.meta,
    color: colors.primary500,
  },
});
