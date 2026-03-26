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
        <Text style={textStyles.title}>现在只做这一件事</Text>
        <StatusChip label={statusLabel} tone={statusTone} />
      </View>

      <View style={styles.focusCard}>
        <Text style={styles.focusLabel}>现在先做</Text>
        <Text style={styles.focusTitle}>{headline}</Text>
        <Text style={styles.focusBody}>{body}</Text>
        <View style={styles.focusActionWrap}>
          <AppButton label={actionLabel} onPress={onAction} />
        </View>
      </View>

      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>这页进度</Text>
        <Text style={styles.footnote}>{footnote}</Text>
      </View>
      <View style={styles.track}>
        <View style={styles.trackSegment}>
          <View style={[styles.step, inputDone && styles.stepDone]}>
            <View style={styles.stepIndexWrap}>
              <Text style={[styles.stepIndex, inputDone && styles.stepIndexDone]}>1</Text>
            </View>
            <View style={styles.stepTop}>
              <Text style={styles.stepTitle}>拍到这页</Text>
              <StatusChip label={inputStatusLabel} tone="primary" />
            </View>
            <Text style={styles.stepMeta} numberOfLines={1}>
              {inputMeta}
            </Text>
          </View>
        </View>
        <View style={styles.trackConnector} />

        <View style={styles.trackSegment}>
          <View style={[styles.step, learningDone && styles.stepDone]}>
            <View style={styles.stepIndexWrap}>
              <Text style={[styles.stepIndex, learningDone && styles.stepIndexDone]}>2</Text>
            </View>
            <View style={styles.stepTop}>
              <Text style={styles.stepTitle}>开始学习</Text>
              <StatusChip label={learningStatusLabel} tone={learningTone} />
            </View>
            <Text style={styles.stepMeta} numberOfLines={1}>
              {learningDisplay}
            </Text>
          </View>
        </View>
        <View style={styles.trackConnector} />

        <View style={styles.trackSegment}>
          <View style={[styles.step, reviewDone && styles.stepDone]}>
            <View style={styles.stepIndexWrap}>
              <Text style={[styles.stepIndex, reviewDone && styles.stepIndexDone]}>3</Text>
            </View>
            <View style={styles.stepTop}>
              <Text style={styles.stepTitle}>收一下</Text>
              <StatusChip label={reviewStatusLabel} tone={reviewTone} />
            </View>
            <Text style={styles.stepMeta} numberOfLines={1}>
              {reviewMeta}
            </Text>
          </View>
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
  focusActionWrap: {
    marginTop: spacing.xs,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  progressLabel: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  track: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
  },
  trackSegment: {
    flex: 1,
    minWidth: 0,
  },
  trackConnector: {
    alignSelf: "center",
    width: 10,
    height: 2,
    borderRadius: 999,
    backgroundColor: colors.borderLight,
    marginTop: 20,
  },
  step: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  stepDone: {
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
  },
  stepIndexWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bgBase,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIndex: {
    ...textStyles.meta,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  stepIndexDone: {
    color: colors.primary700,
  },
  stepTop: {
    gap: spacing.xxs,
  },
  stepTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  stepMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  footnote: {
    ...textStyles.caption,
    color: colors.textTertiary,
    textAlign: "right",
    flexShrink: 1,
  },
});
