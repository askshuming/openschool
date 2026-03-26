import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "../AppCard";
import { StatusChip } from "../StatusChip";
import { colors, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface LearningCompletionBridgeCardProps {
  lessonTitle: string;
  routeLabel?: string;
}

export function LearningCompletionBridgeCard({
  lessonTitle,
  routeLabel,
}: LearningCompletionBridgeCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowTop}>
        <Text style={styles.title}>这一页已经学完了</Text>
        <StatusChip label="下一步已接上" tone="primary" />
      </View>
      <Text style={styles.text}>
        {`回到首页后，会先把「${lessonTitle}」稳稳收一下，再接温和复习。今天如果还有新的不会内容，继续拍下一页就行。`}
      </Text>
      <View style={styles.metaRow}>
        {routeLabel ? <StatusChip label={routeLabel} tone="accent" /> : null}
        <StatusChip label="先收 1 题温和复习" />
        <StatusChip label="再拍下一页" />
      </View>
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
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
