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
        <Text style={textStyles.title}>孩子现在</Text>
        <StatusChip label={childGradeLabel} tone="primary" />
      </View>
      <Text style={styles.profileName}>{childDisplayName}</Text>
      <View style={styles.metaRow}>
        <StatusChip label={`当前重点：${focusLabel}`} />
        {uploadedTextbookLabel ? <StatusChip label={`教材：${uploadedTextbookLabel}`} tone="accent" /> : null}
      </View>
      {!uploadedTextbookLabel ? (
        <Text style={styles.meta}>还没有固定教材信息时，也可以直接上传练习题、板书或图片，系统会照样安排学习路线。</Text>
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
