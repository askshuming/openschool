import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "../AppButton";
import { colors, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface ScreenEmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ScreenEmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: ScreenEmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={textStyles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  message: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
});
