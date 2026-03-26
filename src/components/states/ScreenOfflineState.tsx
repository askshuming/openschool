import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "../AppButton";
import { colors, spacing } from "../../design/tokens";
import { layoutStyles, textStyles } from "../../design/theme";

interface ScreenOfflineStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onRetry?: () => void;
}

export function ScreenOfflineState({
  title = "当前离线",
  message = "请检查网络连接后重试。",
  actionLabel = "重新连接",
  onRetry,
}: ScreenOfflineStateProps) {
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
