import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface ParentMetricsGridProps {
  weeklyCompletedLessons: number;
  avgStudyMinutes: number;
  masteredCount: number;
  pendingReviewCount: number;
}

function MetricTile({
  icon,
  label,
  value,
  meta,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <View style={styles.metricTile}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={18} color={colors.primary600} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricMeta}>{meta}</Text>
    </View>
  );
}

export function ParentMetricsGrid({
  weeklyCompletedLessons,
  avgStudyMinutes,
  masteredCount,
  pendingReviewCount,
}: ParentMetricsGridProps) {
  return (
    <View style={styles.metricGrid}>
      <MetricTile icon="school-outline" label="本周学习" value={`${weeklyCompletedLessons}`} meta="次内容学习" />
      <MetricTile icon="time-outline" label="平均时长" value={`${avgStudyMinutes} 分`} meta="单次学习" />
      <MetricTile icon="sparkles-outline" label="掌握能力" value={`${masteredCount}`} meta="项能力点" />
      <MetricTile icon="refresh-circle-outline" label="待复习" value={`${pendingReviewCount}`} meta="项温和巩固" />
    </View>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricTile: {
    minWidth: "47%",
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.sm,
    gap: spacing.xxs,
    ...shadow.card,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  metricLabel: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  metricValue: {
    ...textStyles.h2,
    color: colors.textPrimary,
    fontSize: 26,
    lineHeight: 30,
  },
  metricMeta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
});
