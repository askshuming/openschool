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
  const nextStep =
    summary.remainingPendingCount > 0
      ? `现在最适合先收下一题；如果今天想开始新内容，也可以回首页直接拍下一页。`
      : "今天的复习先到这里。回首页后可以继续拍新的不会内容。";

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
            <Text style={styles.nextStep}>{nextStep}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <StatusChip label={`已完成 ${summary.completedCount} 题`} tone="accent" />
          {summary.remainingPendingCount > 0 ? (
            <StatusChip label={`还剩 ${summary.remainingPendingCount} 题`} />
          ) : (
            <StatusChip label="今天的复习已清空" tone="primary" />
          )}
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
  nextStep: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
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
