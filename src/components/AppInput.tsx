import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../design/tokens";
import { textStyles } from "../design/theme";

interface AppInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoFocus?: boolean;
}

export function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoFocus = false,
}: AppInputProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        style={styles.input}
        placeholderTextColor={colors.textTertiary}
        autoFocus={autoFocus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.primary50,
    paddingHorizontal: spacing.md,
    ...textStyles.body,
    color: colors.textPrimary,
  },
});
