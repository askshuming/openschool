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
        <Text style={textStyles.title}>最近变化</Text>
        <StatusChip label={`${recitationCompletedCount} 次朗读`} tone="primary" />
      </View>
      <Text style={styles.lead}>
        {masteredSkillLabels.length > 0
          ? `已经开始稳住 ${masteredSkillLabels.length} 项能力，继续按现在这个节奏推进。`
          : "学习节奏还在建立，先把拍一页、学一轮、复习一题这个闭环跑顺。"}
      </Text>
      <View style={styles.metaRow}>
        {masteredSkillLabels.length > 0 ? (
          masteredSkillLabels.slice(0, 4).map((label) => <StatusChip key={label} label={label} tone="primary" />)
        ) : (
          <StatusChip label="掌握能力会在学习后出现" />
        )}
      </View>
      <Text style={styles.meta}>
        最近更常卡住：字词没懂 {Math.round(vocabUnknownRate * 100)}% · 证据句没找到 {Math.round(evidenceMissedRate * 100)}% · 主旨偏差{" "}
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
