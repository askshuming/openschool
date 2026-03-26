import { StyleSheet, Text, View } from "react-native";
import { AppCard } from "../AppCard";
import { StatusChip } from "../StatusChip";
import { colors, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface ParentJourneyCardProps {
  currentJourneyStatus: string;
  statusTone: "primary" | "accent";
  title: string;
  inputDone: boolean;
  inputTitle: string;
  inputMeta: string;
  learningDone: boolean;
  learningTitle: string;
  learningMeta: string;
  reviewDone: boolean;
  reviewTitle: string;
  reviewMeta: string;
}

export function ParentJourneyCard({
  currentJourneyStatus,
  statusTone,
  title,
  inputDone,
  inputTitle,
  inputMeta,
  learningDone,
  learningTitle,
  learningMeta,
  reviewDone,
  reviewTitle,
  reviewMeta,
}: ParentJourneyCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={textStyles.title}>当前学习主线</Text>
        <StatusChip label={currentJourneyStatus} tone={statusTone} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.track}>
        <View style={[styles.step, inputDone && styles.stepDone]}>
          <Text style={styles.stepLabel}>输入内容</Text>
          <Text style={styles.stepValue} numberOfLines={2}>
            {inputTitle}
          </Text>
          <Text style={styles.stepMeta}>{inputMeta}</Text>
        </View>
        <View style={[styles.step, learningDone && styles.stepDone]}>
          <Text style={styles.stepLabel}>开始学习</Text>
          <Text style={styles.stepValue} numberOfLines={2}>
            {learningTitle}
          </Text>
          <Text style={styles.stepMeta}>{learningMeta}</Text>
        </View>
        <View style={[styles.step, reviewDone && styles.stepDone]}>
          <Text style={styles.stepLabel}>温和复习</Text>
          <Text style={styles.stepValue} numberOfLines={2}>
            {reviewTitle}
          </Text>
          <Text style={styles.stepMeta}>{reviewMeta}</Text>
        </View>
      </View>
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
  title: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  track: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  step: {
    flex: 1,
    minWidth: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  stepDone: {
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
  },
  stepLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  stepValue: {
    ...textStyles.meta,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  stepMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
    minHeight: 18,
  },
});
