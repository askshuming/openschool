import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../design/tokens";
import { textStyles } from "../design/theme";

interface StatusChipProps {
  label: string;
  tone?: "default" | "primary" | "accent";
}

export function StatusChip({ label, tone = "default" }: StatusChipProps) {
  return (
    <View
      style={[
        styles.base,
        tone === "primary" && styles.primary,
        tone === "accent" && styles.accent,
      ]}
    >
      <Text
        style={[
          styles.label,
          tone === "primary" && styles.primaryLabel,
          tone === "accent" && styles.accentLabel,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 28,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  primary: {
    backgroundColor: colors.primary100,
    borderColor: colors.primary200,
  },
  accent: {
    backgroundColor: colors.accent100,
    borderColor: colors.accent300,
  },
  label: {
    ...textStyles.meta,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  primaryLabel: {
    color: colors.primary500,
  },
  accentLabel: {
    color: colors.warning,
  },
});
