import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "../AppButton";
import { MascotBuddy, MascotState } from "../MascotBuddy";
import { StatusChip } from "../StatusChip";
import { colors, radius, shadow, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface ParentHeroCardProps {
  currentJourneyStatus: string;
  statusTone: "primary" | "accent";
  title: string;
  body: string;
  spotlightLabel: string;
  spotlightTitle: string;
  spotlightMeta: string;
  childGradeLabel: string;
  focusLabel: string;
  uploadedTextbookLabel: string | null;
  mascotState: MascotState;
  mascotSpeech: string;
  primaryAction: {
    label: string;
    onPress: () => void;
  };
  secondaryAction: {
    label: string;
    onPress: () => void;
  };
}

export function ParentHeroCard({
  currentJourneyStatus,
  statusTone,
  title,
  body,
  spotlightLabel,
  spotlightTitle,
  spotlightMeta,
  childGradeLabel,
  focusLabel,
  uploadedTextbookLabel,
  mascotState,
  mascotSpeech,
  primaryAction,
  secondaryAction,
}: ParentHeroCardProps) {
  return (
    <LinearGradient
      colors={[colors.primary100, colors.primary50]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroGlowOne} />
      <View style={styles.heroGlowTwo} />
      <View style={styles.heroTop}>
        <View style={styles.heroCopy}>
          <View style={styles.heroChipRow}>
            <StatusChip label="我的" tone="primary" />
            <StatusChip label={currentJourneyStatus} tone={statusTone} />
          </View>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroText}>{body}</Text>
          <View style={styles.spotlightCard}>
            <Text style={styles.spotlightLabel}>{spotlightLabel}</Text>
            <Text style={styles.spotlightTitle}>{spotlightTitle}</Text>
            <Text style={styles.spotlightMeta}>{spotlightMeta}</Text>
          </View>
          <View style={styles.heroMetaRow}>
            <StatusChip label={childGradeLabel} tone="primary" />
            <StatusChip label={`重点：${focusLabel}`} />
            {uploadedTextbookLabel ? <StatusChip label={uploadedTextbookLabel} tone="accent" /> : null}
          </View>
        </View>
        <MascotBuddy state={mascotState} size={104} speech={mascotSpeech} />
      </View>
      <View style={styles.heroActionRow}>
        <View style={styles.heroActionCell}>
          <AppButton label={primaryAction.label} onPress={primaryAction.onPress} />
        </View>
        <View style={styles.heroActionCell}>
          <AppButton label={secondaryAction.label} onPress={secondaryAction.onPress} variant="secondary" />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.card,
  },
  heroGlowOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: colors.primary200,
    top: -72,
    left: -44,
    opacity: 0.86,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 144,
    height: 144,
    borderRadius: 999,
    backgroundColor: colors.accent100,
    right: -34,
    bottom: -42,
    opacity: 0.94,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  heroChipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  heroTitle: {
    ...textStyles.h2,
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  heroText: {
    ...textStyles.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  spotlightCard: {
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: colors.primary200,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  spotlightLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  spotlightTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  spotlightMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  heroActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroActionCell: {
    flex: 1,
  },
});
