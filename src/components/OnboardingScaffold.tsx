import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../design/tokens";
import { layoutStyles, textStyles } from "../design/theme";
import { AppCard } from "./AppCard";

interface OnboardingScaffoldProps extends PropsWithChildren {
  step: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export function OnboardingScaffold({
  step,
  title,
  subtitle,
  icon,
  children,
}: OnboardingScaffoldProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={layoutStyles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: spacing.sm + insets.top,
          paddingBottom: spacing.xxl + Math.max(insets.bottom, spacing.md),
        },
      ]}
      contentInsetAdjustmentBehavior="never"
      scrollIndicatorInsets={{
        top: insets.top,
        bottom: Math.max(insets.bottom, spacing.md),
      }}
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      alwaysBounceVertical
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heroWrap}>
        <LinearGradient
          colors={[colors.primary100, colors.primary50]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroArt}
        >
          <View style={[styles.dot, styles.dotOne]} />
          <View style={[styles.dot, styles.dotTwo]} />
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={56} color={colors.primary600} />
          </View>
        </LinearGradient>
        <Text style={styles.stepText}>{step}</Text>
        <Text style={textStyles.h2}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <AppCard style={styles.bottomCard}>{children}</AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.pageHorizontal,
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  heroWrap: {
    gap: spacing.sm,
  },
  heroArt: {
    height: 220,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    borderRadius: 999,
  },
  dotOne: {
    width: 110,
    height: 110,
    left: -30,
    top: 18,
    backgroundColor: colors.primary200,
    opacity: 0.8,
  },
  dotTwo: {
    width: 132,
    height: 132,
    right: -26,
    bottom: -20,
    backgroundColor: colors.accent100,
    opacity: 0.9,
  },
  stepText: {
    ...textStyles.meta,
    color: colors.primary500,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  bottomCard: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
