import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, shadow, spacing } from "../design/tokens";

interface AppCardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

export function AppCard({ children, style }: AppCardProps) {
  return (
    <LinearGradient
      colors={[colors.bgCard, colors.bgElevated]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.card,
  },
});
