import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, shadow, spacing } from "../design/tokens";
import { layoutStyles, textStyles } from "../design/theme";
import { MascotBuddy, MascotState } from "./MascotBuddy";
import { AppCard } from "./AppCard";

interface OnboardingScaffoldProps extends PropsWithChildren {
  step: string;
  stepIndex: number;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  cardTitle?: string;
  cardSubtitle?: string;
  highlights?: string[];
  mascotState?: MascotState;
  mascotSpeech?: string;
}

export function OnboardingScaffold({
  step,
  stepIndex,
  title,
  subtitle,
  icon,
  cardTitle,
  cardSubtitle,
  highlights,
  mascotState = "teacher",
  mascotSpeech,
  children,
}: OnboardingScaffoldProps) {
  const insets = useSafeAreaInsets();
  const totalSteps = 4;

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
        <View style={styles.heroHeader}>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>{step}</Text>
          </View>
          <View style={styles.progressRow}>
            {Array.from({ length: totalSteps }).map((_, index) => {
              const active = index < stepIndex;
              return (
                <View
                  key={index}
                  style={[
                    styles.progressSegment,
                    active ? styles.progressSegmentActive : styles.progressSegmentInactive,
                  ]}
                />
              );
            })}
          </View>
        </View>

        <LinearGradient
          colors={["#F6FBF8", "#EEF7F1", "#F7FBF8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.95 }}
          style={styles.heroArt}
        >
          <View style={[styles.glow, styles.glowLeft]} />
          <View style={[styles.glow, styles.glowRight]} />
          <View style={styles.heroArtHeader}>
            <View style={styles.heroBadge}>
              <Ionicons name={icon} size={16} color={colors.primary600} />
              <Text style={styles.heroBadgeText}>首开设置</Text>
            </View>
            <Text style={styles.heroAccent}>拍一页之前，先把起点调对</Text>
          </View>
          <View style={styles.heroArtBody}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>更像老师带着开始</Text>
              <Text style={styles.heroTitle}>{title}</Text>
              <Text style={styles.heroSubtitle}>{subtitle}</Text>
              {highlights?.length ? (
                <View style={styles.highlightRow}>
                  {highlights.map((item) => (
                    <View key={item} style={styles.highlightPill}>
                      <Text style={styles.highlightText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            <MascotBuddy
              state={mascotState}
              size={122}
              speech={mascotSpeech}
              style={styles.mascot}
            />
          </View>
        </LinearGradient>
      </View>

      <AppCard style={styles.bottomCard}>
        {cardTitle ? (
          <View style={styles.bottomCardHeader}>
            <Text style={styles.bottomCardTitle}>{cardTitle}</Text>
            {cardSubtitle ? <Text style={styles.bottomCardSubtitle}>{cardSubtitle}</Text> : null}
          </View>
        ) : null}
        {children}
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.pageHorizontal,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  heroWrap: {
    gap: spacing.sm,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepPill: {
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "#FDF6EB",
    borderWidth: 1,
    borderColor: colors.accent300,
    alignItems: "center",
    justifyContent: "center",
  },
  stepPillText: {
    ...textStyles.meta,
    color: colors.warning,
  },
  progressRow: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
  },
  progressSegment: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
  },
  progressSegmentActive: {
    backgroundColor: colors.primary500,
  },
  progressSegmentInactive: {
    backgroundColor: colors.primary200,
  },
  heroArt: {
    minHeight: 296,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    ...shadow.card,
  },
  heroArtHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(220,239,228,0.92)",
  },
  heroBadgeText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  heroAccent: {
    ...textStyles.meta,
    color: colors.textSecondary,
    flex: 1,
    textAlign: "right",
  },
  heroArtBody: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
    flex: 1,
    paddingTop: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  heroEyebrow: {
    ...textStyles.meta,
    color: colors.primary500,
  },
  heroTitle: {
    ...textStyles.h2,
    paddingRight: spacing.sm,
  },
  heroSubtitle: {
    ...textStyles.body,
    color: colors.textSecondary,
    paddingRight: spacing.sm,
  },
  highlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  highlightPill: {
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: "rgba(220,239,228,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  highlightText: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  mascot: {
    marginRight: -8,
    marginBottom: -4,
  },
  glow: {
    position: "absolute",
    borderRadius: 999,
  },
  glowLeft: {
    width: 180,
    height: 180,
    left: -54,
    top: 22,
    backgroundColor: "rgba(143,212,178,0.36)",
  },
  glowRight: {
    width: 186,
    height: 186,
    right: -54,
    bottom: -30,
    backgroundColor: "rgba(249,222,194,0.42)",
  },
  bottomCard: {
    gap: spacing.md,
    marginTop: -spacing.sm,
    padding: spacing.lg,
  },
  bottomCardHeader: {
    gap: spacing.xxs,
  },
  bottomCardTitle: {
    ...textStyles.title,
  },
  bottomCardSubtitle: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
});
