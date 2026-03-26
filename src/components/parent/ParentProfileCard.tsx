import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "../AppCard";
import { StatusChip } from "../StatusChip";
import { colors, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface ParentProfileCardProps {
  childGradeLabel: string;
  childDisplayName: string;
  focusLabel: string;
  uploadedTextbookLabel: string | null;
}

export function ParentProfileCard({
  childGradeLabel,
  childDisplayName,
  focusLabel,
  uploadedTextbookLabel,
}: ParentProfileCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={textStyles.title}>孩子档案</Text>
        <StatusChip label={childGradeLabel} tone="primary" />
      </View>
      <Text style={styles.profileName}>{childDisplayName}</Text>
      <View style={styles.metaRow}>
        <StatusChip label={`当前重点：${focusLabel}`} />
        {uploadedTextbookLabel ? <StatusChip label={`教材：${uploadedTextbookLabel}`} tone="accent" /> : null}
      </View>
      {!uploadedTextbookLabel ? (
        <Text style={styles.meta}>未上传教材时，不展示教材信息；上传练习题、板书或图片也能自动安排学习内容。</Text>
      ) : null}
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
  profileName: {
    ...textStyles.h2,
    color: colors.textPrimary,
    fontSize: 26,
    lineHeight: 30,
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
