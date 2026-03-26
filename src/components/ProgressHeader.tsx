import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../design/tokens";
import { textStyles } from "../design/theme";

interface ProgressHeaderProps {
  lessonTitle: string;
  currentStep: number;
  totalSteps: number;
}

export function ProgressHeader({
  lessonTitle,
  currentStep,
  totalSteps,
}: ProgressHeaderProps) {
  const progress = Math.max(0, Math.min(1, currentStep / totalSteps));

  return (
    <View style={styles.container}>
      <Text style={textStyles.title}>{lessonTitle}</Text>
      <Text style={[textStyles.meta, styles.stepText]}>
        第 {currentStep} / {totalSteps} 步
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  stepText: {
    color: colors.textSecondary,
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primary200,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primary500,
    borderRadius: radius.pill,
  },
});
