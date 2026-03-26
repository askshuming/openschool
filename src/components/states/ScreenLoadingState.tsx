import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../../design/tokens";
import { layoutStyles, textStyles } from "../../design/theme";

interface ScreenLoadingStateProps {
  text?: string;
}

export function ScreenLoadingState({ text = "正在加载..." }: ScreenLoadingStateProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        layoutStyles.screen,
        styles.center,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <ActivityIndicator color={colors.primary500} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  text: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
});
