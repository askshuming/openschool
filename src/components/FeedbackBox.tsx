import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../design/tokens";
import { textStyles } from "../design/theme";
import { MascotBuddy } from "./MascotBuddy";
import { StatusChip } from "./StatusChip";

interface FeedbackBoxProps {
  isCorrect: boolean;
  message: string;
  evidence?: string;
}

export function FeedbackBox({ isCorrect, message, evidence }: FeedbackBoxProps) {
  const iconName = isCorrect ? "checkmark-circle" : "bulb";
  const mascotState = isCorrect ? "happy" : "encourage";
  const statusLabel = isCorrect ? "学会了" : "我陪你";
  const stateLabel = isCorrect ? "开心反馈" : "鼓励反馈";

  return (
    <View style={[styles.base, isCorrect ? styles.correct : styles.wrong]}>
      <View style={styles.header}>
        <MascotBuddy
          state={mascotState}
          size={82}
          speech={isCorrect ? "这一步学会啦" : "没关系，我陪你再来一次"}
        />
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons
                name={iconName}
                size={20}
                color={isCorrect ? colors.success : colors.warning}
              />
              <Text style={styles.titleText}>{isCorrect ? "这一步做对了" : "这一步先别急"}</Text>
            </View>
            <View style={styles.chipRow}>
              <StatusChip label={statusLabel} tone={isCorrect ? "accent" : "primary"} />
              <StatusChip label={stateLabel} />
            </View>
          </View>
          <Text style={textStyles.body}>{message}</Text>
        </View>
      </View>
      {evidence ? (
        <View style={styles.evidenceWrap}>
          <Text style={styles.evidenceLabel}>文中依据</Text>
          <Text style={textStyles.body}>{evidence}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  correct: {
    backgroundColor: colors.primary100,
    borderColor: colors.primary200,
  },
  wrong: {
    backgroundColor: colors.accent100,
    borderColor: colors.accent300,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerContent: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    gap: spacing.xs,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  titleText: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  evidenceWrap: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  evidenceLabel: {
    ...textStyles.meta,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
});
