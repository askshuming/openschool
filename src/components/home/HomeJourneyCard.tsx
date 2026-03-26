import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "../AppButton";
import { AppCard } from "../AppCard";
import { StatusChip } from "../StatusChip";
import { JourneyTone } from "../../domain/learningJourneyPresentation";
import { colors, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface HomeJourneyCardProps {
  statusLabel: string;
  statusTone: JourneyTone;
  headline: string;
  body: string;
  inputDone: boolean;
  inputMeta: string;
  inputStatusLabel: string;
  learningDone: boolean;
  learningDisplay: string;
  learningStatusLabel: string;
  learningTone: JourneyTone;
  reviewDone: boolean;
  reviewMeta: string;
  reviewStatusLabel: string;
  reviewTone: JourneyTone;
  footnote: string;
  actionLabel: string;
  onAction: () => void;
}

export function HomeJourneyCard({
  statusLabel,
  statusTone,
  headline,
  body,
  inputDone,
  inputMeta,
  inputStatusLabel,
  learningDone,
  learningDisplay,
  learningStatusLabel,
  learningTone,
  reviewDone,
  reviewMeta,
  reviewStatusLabel,
  reviewTone,
  footnote,
  actionLabel,
  onAction,
}: HomeJourneyCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowTop}>
        <Text style={textStyles.title}>这页现在走到哪了</Text>
        <StatusChip label={statusLabel} tone={statusTone} />
      </View>
      <View style={styles.focusCard}>
        <Text style={styles.focusLabel}>下一步</Text>
        <Text style={styles.focusTitle}>{headline}</Text>
        <Text style={styles.focusBody}>{body}</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.step, inputDone && styles.stepDone]}>
          <Text style={styles.stepTitle}>拍到这页</Text>
          <Text style={styles.stepMeta} numberOfLines={2}>
            {inputMeta}
          </Text>
          <StatusChip label={inputStatusLabel} tone="primary" />
        </View>

        <View style={[styles.step, learningDone && styles.stepDone]}>
          <Text style={styles.stepTitle}>开始学习</Text>
          <Text style={styles.stepMeta} numberOfLines={2}>
            {learningDisplay}
          </Text>
          <StatusChip label={learningStatusLabel} tone={learningTone} />
        </View>

        <View style={[styles.step, reviewDone && styles.stepDone]}>
          <Text style={styles.stepTitle}>收一下</Text>
          <Text style={styles.stepMeta} numberOfLines={2}>
            {reviewMeta}
          </Text>
          <StatusChip label={reviewStatusLabel} tone={reviewTone} />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footnote}>{footnote}</Text>
        <View style={styles.actionWrap}>
          <AppButton label={actionLabel} onPress={onAction} />
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  focusCard: {
    gap: spacing.xxs,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  focusLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  focusTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
    fontSize: 20,
  },
  focusBody: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  track: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  step: {
    flex: 1,
    minWidth: 92,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  stepDone: {
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
  },
  stepTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  stepMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
    minHeight: 36,
  },
  footer: {
    gap: spacing.sm,
  },
  footnote: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  actionWrap: {
    width: "100%",
  },
});
