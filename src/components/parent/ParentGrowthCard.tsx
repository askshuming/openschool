import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "../AppCard";
import { StatusChip } from "../StatusChip";
import { colors, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface ParentGrowthCardProps {
  recitationCompletedCount: number;
  masteredSkillLabels: string[];
  vocabUnknownRate: number;
  evidenceMissedRate: number;
  mainIdeaOffRate: number;
}

export function ParentGrowthCard({
  recitationCompletedCount,
  masteredSkillLabels,
  vocabUnknownRate,
  evidenceMissedRate,
  mainIdeaOffRate,
}: ParentGrowthCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={textStyles.title}>这周成长</Text>
        <StatusChip label={`${recitationCompletedCount} 次朗读`} tone="primary" />
      </View>
      <Text style={styles.lead}>
        {masteredSkillLabels.length > 0
          ? `已经稳定掌握 ${masteredSkillLabels.length} 项能力，继续保持这个节奏。`
          : "刚开始建立学习节奏，先从拍一页开始就够了。"}
      </Text>
      <View style={styles.metaRow}>
        {masteredSkillLabels.length > 0 ? (
          masteredSkillLabels.slice(0, 4).map((label) => <StatusChip key={label} label={label} tone="primary" />)
        ) : (
          <StatusChip label="掌握能力会在学习后出现" />
        )}
      </View>
      <Text style={styles.meta}>
        高频问题：字词没懂 {Math.round(vocabUnknownRate * 100)}% · 证据句没找到 {Math.round(evidenceMissedRate * 100)}% · 主旨偏差{" "}
        {Math.round(mainIdeaOffRate * 100)}%
      </Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  lead: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  meta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
});
