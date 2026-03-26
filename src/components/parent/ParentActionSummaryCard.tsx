import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "../AppButton";
import { AppCard } from "../AppCard";
import { MascotBuddy, MascotState } from "../MascotBuddy";
import { StatusChip } from "../StatusChip";
import { colors, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface ParentActionSummaryCardProps {
  statusLabel: string;
  statusTone: "primary" | "accent";
  title: string;
  body: string;
  bullets: string[];
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

export function ParentActionSummaryCard({
  statusLabel,
  statusTone,
  title,
  body,
  bullets,
  mascotState,
  mascotSpeech,
  primaryAction,
  secondaryAction,
}: ParentActionSummaryCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <View style={styles.chips}>
            <StatusChip label="现在你只用做这一件事" tone="primary" />
            <StatusChip label={statusLabel} tone={statusTone} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
        <MascotBuddy state={mascotState} size={84} speech={mascotSpeech} />
      </View>

      <View style={styles.bulletCard}>
        {bullets.map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <AppButton label={primaryAction.label} onPress={primaryAction.onPress} />
        <AppButton label={secondaryAction.label} onPress={secondaryAction.onPress} variant="secondary" />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  title: {
    ...textStyles.title,
    fontSize: 22,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  body: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  bulletCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary500,
  },
  bulletText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
  },
});
