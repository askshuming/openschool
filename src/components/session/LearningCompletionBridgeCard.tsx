import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "../AppCard";
import { StatusChip } from "../StatusChip";
import { colors, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

export function LearningCompletionBridgeCard() {
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowTop}>
        <Text style={styles.title}>这一页已经带过去了</Text>
        <StatusChip label="自动续上" tone="primary" />
      </View>
      <Text style={styles.text}>
        不用手动找下一课。回到首页后，这次内容会自动进入主线，接着安排温和复习。
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
