import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "../AppCard";
import { StatusChip } from "../StatusChip";
import { colors, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

export function LearningCompletionBridgeCard() {
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowTop}>
        <Text style={styles.title}>完成后系统会自动接上下一步</Text>
        <StatusChip label="自动续上" tone="primary" />
      </View>
      <Text style={styles.text}>
        这节学习结束后，首页主线会切到这次内容，方便明天继续看进度或直接进入温和复习。
      </Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  text: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
