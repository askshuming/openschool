import { Animated, StyleSheet, Text, View } from "react-native";
import { ActivityCard, SessionAnswerResponse } from "../../api/contracts";
import { AppCard } from "../AppCard";
import { MascotBuddy, MascotState } from "../MascotBuddy";
import { StatusChip } from "../StatusChip";
import { LearningCardBody } from "./LearningCardBody";
import { colors, motion, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface RecitationAssessmentLike {
  transcript: string;
  matchRatio: number;
  isCorrect: boolean;
  message: string;
  evidence: string;
}

interface LearningCue {
  label: string;
  tip: string;
  mascotState: MascotState;
  speech: string;
}

interface LearningStepCardProps {
  card: ActivityCard;
  currentStepLabel: string;
  skillTagLabel: string;
  learningCue: LearningCue | null;
  fadeAnim: Animated.Value;
  selectedOption: number | null;
  answerResult: SessionAnswerResponse | null;
  onSelectOption: (index: number) => void;
  latestInputTitle?: string;
  recitationRecognizing: boolean;
  recitationSupportText: string;
  recitationTranscript: string;
  recitationFinalTranscript: string;
  recitationDone: boolean;
  recitationAssessment: RecitationAssessmentLike | null;
  recitationErrorText?: string | null;
  recitationVolume: number;
  showRecitationPreviewFallback: boolean;
  onPlayRecitationSample: () => void;
  onToggleRecitationCapture: () => void;
  onCompleteRecitationPreview: () => void;
}

export function LearningStepCard({
  card,
  currentStepLabel,
  skillTagLabel,
  learningCue,
  fadeAnim,
  selectedOption,
  answerResult,
  onSelectOption,
  latestInputTitle,
  recitationRecognizing,
  recitationSupportText,
  recitationTranscript,
  recitationFinalTranscript,
  recitationDone,
  recitationAssessment,
  recitationErrorText,
  recitationVolume,
  showRecitationPreviewFallback,
  onPlayRecitationSample,
  onToggleRecitationCapture,
  onCompleteRecitationPreview,
}: LearningStepCardProps) {
  return (
    <Animated.View
      style={[
        styles.motion,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        },
      ]}
    >
      <AppCard style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <StatusChip label={currentStepLabel} tone="accent" />
          <StatusChip label={skillTagLabel} tone="primary" />
        </View>
        {learningCue ? (
          <View style={styles.learningCueCard}>
            <MascotBuddy
              state={learningCue.mascotState}
              size={74}
              speech={learningCue.speech}
              style={styles.learningCueMascot}
            />
            <View style={styles.learningCueCopy}>
              <Text style={styles.learningCueLabel}>{learningCue.label}</Text>
              <Text style={styles.learningCueText}>{learningCue.tip}</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.stepFocusBlock}>
          <Text style={styles.stepFocusLabel}>现在只做这一件事</Text>
          <Text style={styles.stepFocusTitle}>{card.payload.title}</Text>
          {latestInputTitle ? (
            <Text style={styles.stepFocusMeta} numberOfLines={1}>
              {`刚才那页：${latestInputTitle}`}
            </Text>
          ) : null}
        </View>
        <LearningCardBody
          card={card}
          selectedOption={selectedOption}
          answerResult={answerResult}
          onSelectOption={onSelectOption}
          latestInputTitle={latestInputTitle}
          recitationRecognizing={recitationRecognizing}
          recitationSupportText={recitationSupportText}
          recitationTranscript={recitationTranscript}
          recitationFinalTranscript={recitationFinalTranscript}
          recitationDone={recitationDone}
          recitationAssessment={recitationAssessment}
          recitationErrorText={recitationErrorText}
          recitationVolume={recitationVolume}
          showRecitationPreviewFallback={showRecitationPreviewFallback}
          onPlayRecitationSample={onPlayRecitationSample}
          onToggleRecitationCapture={onToggleRecitationCapture}
          onCompleteRecitationPreview={onCompleteRecitationPreview}
        />
      </AppCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  motion: {
    width: "100%",
  },
  card: {
    gap: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  learningCueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  learningCueMascot: {
    marginLeft: -6,
  },
  learningCueCopy: {
    flex: 1,
    gap: 2,
  },
  learningCueLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  learningCueText: {
    ...textStyles.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  stepFocusBlock: {
    gap: spacing.xxs,
  },
  stepFocusLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  stepFocusTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
  },
  stepFocusMeta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
});
