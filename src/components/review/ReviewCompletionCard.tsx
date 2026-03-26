import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { AppCard } from "../AppCard";
import { MascotBuddy } from "../MascotBuddy";
import { StatusChip } from "../StatusChip";
import { colors, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

export interface ReviewCompletionSummary {
  mode: "single" | "batch";
  completedCount: number;
  createdAt: string;
}

interface ReviewCompletionCardProps {
  summary: ReviewCompletionSummary;
  summaryAnim: Animated.Value;
  onDismiss: () => void;
  onBackHome: () => void;
}

export function ReviewCompletionCard({
  summary,
  summaryAnim,
  onDismiss,
  onBackHome,
}: ReviewCompletionCardProps) {
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
          <MascotBuddy state="happy" size={88} speech={summary.mode === "batch" ? "今天的复习先收到这里" : "这题已经复习稳了"} />
          <View style={styles.summaryCopy}>
            <View style={styles.rowTop}>
              <Text style={textStyles.title}>这次复习收住了</Text>
              <StatusChip tone="accent" label="已达成" />
            </View>
            <Text style={styles.body}>
              {summary.mode === "batch" ? `今天已经稳稳复习了 ${summary.completedCount} 题。` : "这一题已经稳稳复习完了。"}
            </Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <Pressable hitSlop={8} onPress={onDismiss}>
            <Text style={styles.link}>收起提示</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={onBackHome}>
            <Text style={styles.link}>回首页拍新内容</Text>
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
    justifyContent: "space-between",
    alignItems: "center",
  },
  link: {
    ...textStyles.meta,
    color: colors.primary500,
  },
});
