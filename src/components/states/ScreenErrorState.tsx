import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "../AppButton";
import { colors, spacing } from "../../design/tokens";
import { layoutStyles, textStyles } from "../../design/theme";

interface ScreenErrorStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onRetry?: () => void;
}

export function ScreenErrorState({
  title = "加载失败",
  message = "请稍后重试",
  actionLabel = "重试",
  onRetry,
}: ScreenErrorStateProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        layoutStyles.screen,
        styles.center,
        styles.pad,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Text style={textStyles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <AppButton label={actionLabel} onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  pad: {
    paddingHorizontal: spacing.pageHorizontal,
  },
  message: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
});
