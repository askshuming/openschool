import { LinearGradient } from "expo-linear-gradient";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, size, spacing } from "../design/tokens";
import { fontFamily } from "../design/theme";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
}: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      pressRetentionOffset={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primaryShell,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        pressed && !disabled && styles.pressed,
        pressed && !disabled && Platform.OS === "ios" && styles.pressedIos,
        disabled && styles.disabled,
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient
          pointerEvents="none"
          colors={[colors.primary500, colors.primary600]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryFill}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          variant === "primary" && styles.primaryLabel,
          variant !== "primary" && styles.secondaryLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Math.max(size.buttonHeight, size.touchTargetMin),
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  primaryShell: {
    borderColor: colors.primary500,
    backgroundColor: colors.primary500,
    shadowColor: colors.primary600,
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 3,
  },
  primaryFill: {
    ...StyleSheet.absoluteFillObject,
  },
  secondary: {
    backgroundColor: colors.primary100,
    borderColor: colors.primary300,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: colors.borderSoft,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  pressedIos: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily,
    fontSize: 16,
    fontWeight: "600",
  },
  primaryLabel: {
    color: "#FFFFFF",
  },
  secondaryLabel: {
    color: colors.textPrimary,
  },
});
