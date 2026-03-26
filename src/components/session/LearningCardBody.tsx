import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ActivityCard, SessionAnswerResponse } from "../../api/contracts";
import { FeedbackBox } from "../FeedbackBox";
import { MascotBuddy } from "../MascotBuddy";
import { StatusChip } from "../StatusChip";
import { colors, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface RecitationAssessmentLike {
  transcript: string;
  matchRatio: number;
  isCorrect: boolean;
  message: string;
  evidence: string;
}

interface LearningCardBodyProps {
  card: ActivityCard;
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

export function LearningCardBody({
  card,
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
}: LearningCardBodyProps) {
  if (card.type === "intro") {
    return (
      <View style={styles.blockGap}>
        {card.payload.goals?.map((goal) => (
          <Text key={goal} style={styles.contentText}>
            {`• ${goal}`}
          </Text>
        ))}
      </View>
    );
  }

  if (card.type === "vocab") {
    return (
      <View style={styles.blockGap}>
        {card.payload.vocabItems?.map((item) => (
          <View key={item.word} style={styles.vocabItem}>
            <Text style={textStyles.title}>
              {item.word} <Text style={styles.pinyin}>{item.pinyin}</Text>
            </Text>
            <Text style={styles.contentText}>{item.explanation}</Text>
            <Text style={styles.subText}>{item.example}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (card.type === "close_reading") {
    return (
      <View style={styles.blockGap}>
        <Text style={styles.subLabel}>原文</Text>
        <Text style={styles.contentText}>{card.payload.paragraph}</Text>
        <Text style={styles.subLabel}>换种说法</Text>
        <Text style={styles.contentText}>{card.payload.simpleExplanation}</Text>
      </View>
    );
  }

  if (card.type === "main_idea") {
    return (
      <View style={styles.blockGap}>
        {card.payload.structure?.map((node) => (
          <Text key={node} style={styles.contentText}>
            {`• ${node}`}
          </Text>
        ))}
        <Text style={styles.subLabel}>主旨</Text>
        <Text style={styles.contentText}>{card.payload.mainIdea}</Text>
      </View>
    );
  }

  if (card.type === "quiz") {
    return (
      <View style={styles.optionWrap}>
        <Text style={styles.contentText}>{card.payload.body}</Text>
        {card.payload.options?.map((option, idx) => {
          const active = selectedOption === idx;
          return (
            <Pressable
              key={option}
              onPress={() => {
                if (!answerResult) {
                  onSelectOption(idx);
                }
              }}
              style={[styles.option, active && styles.optionActive]}
            >
              <Text style={[textStyles.body, active && styles.optionTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
        {answerResult ? (
          <FeedbackBox
            isCorrect={Boolean(answerResult.correct)}
            message={
              answerResult.correct
                ? answerResult.feedback.whyWrong
                : `${answerResult.feedback.whyWrong} ${answerResult.feedback.retryQuestion}`
            }
            evidence={answerResult.feedback.evidenceText}
          />
        ) : null}
      </View>
    );
  }

  if (card.type === "feedback") {
    return (
      <View style={styles.blockGap}>
        {answerResult ? (
          <FeedbackBox
            isCorrect={Boolean(answerResult.correct)}
            message={answerResult.feedback.whyWrong}
            evidence={answerResult.feedback.evidenceText}
          />
        ) : (
          <Text style={styles.contentText}>先完成小测后再查看反馈。</Text>
        )}
      </View>
    );
  }

  if (card.type === "recitation") {
    const meterWidth = Math.max(
      12,
      recitationRecognizing
        ? recitationVolume * 100
        : recitationAssessment
          ? recitationAssessment.matchRatio * 100
          : 12,
    );

    return (
      <View style={styles.blockGap}>
        <Text style={styles.subLabel}>跟读片段</Text>
        <View style={styles.recitationQuoteWrap}>
          <Text style={styles.recitationQuote}>{card.payload.recitationText}</Text>
        </View>
        <Text style={styles.contentText}>
          {card.payload.recitationTip ?? "先听示范，再完整朗读一遍。"}
        </Text>
        <View style={styles.recitationActionRow}>
          <Pressable
            hitSlop={8}
            onPress={onPlayRecitationSample}
            style={({ pressed }) => [
              styles.recitationSecondaryAction,
              pressed && styles.recitationActionPressed,
            ]}
          >
            <Ionicons name="volume-high-outline" size={18} color={colors.primary500} />
            <Text style={styles.recitationSecondaryText}>听示范</Text>
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={onToggleRecitationCapture}
            style={({ pressed }) => [
              styles.recitationPrimaryAction,
              recitationRecognizing && styles.recitationPrimaryActionActive,
              pressed && styles.recitationActionPressed,
            ]}
          >
            <Ionicons
              name={recitationRecognizing ? "stop-circle-outline" : "mic-outline"}
              size={20}
              color={recitationRecognizing ? "#FFFFFF" : colors.primary600}
            />
            <Text
              style={[
                styles.recitationPrimaryText,
                recitationRecognizing && styles.recitationPrimaryTextActive,
              ]}
            >
              {recitationRecognizing ? "结束跟读" : "开始跟读"}
            </Text>
          </Pressable>
        </View>
        {showRecitationPreviewFallback ? (
          <Pressable
            hitSlop={8}
            onPress={onCompleteRecitationPreview}
            style={({ pressed }) => [
              styles.recitationPreviewFallback,
              pressed && styles.recitationActionPressed,
            ]}
          >
            <Ionicons name="construct-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.recitationPreviewFallbackText}>当前预览环境先标记完成</Text>
          </Pressable>
        ) : null}
        <View style={styles.recitationStatusCard}>
          <View style={styles.recitationStatusRow}>
            <StatusChip label={recitationSupportText} tone="primary" />
            {recitationRecognizing ? (
              <StatusChip label="识别中" tone="accent" />
            ) : recitationAssessment ? (
              <StatusChip label={`${Math.round(recitationAssessment.matchRatio * 100)}% 匹配`} tone="accent" />
            ) : null}
          </View>
          <View style={styles.recitationMeterTrack}>
            <View style={[styles.recitationMeterFill, { width: `${meterWidth}%` }]} />
          </View>
          <Text style={styles.recitationTranscriptLabel}>
            {recitationRecognizing ? "实时识别" : recitationAssessment ? "本次识别结果" : "准备跟读"}
          </Text>
          <Text style={styles.recitationTranscriptText}>
            {recitationFinalTranscript ||
              recitationTranscript ||
              recitationAssessment?.transcript ||
              "点“开始跟读”后，系统会直接识别孩子刚刚读出的内容。"}
          </Text>
        </View>
        {recitationErrorText ? <Text style={styles.errorHint}>{recitationErrorText}</Text> : null}
        {recitationDone && recitationAssessment ? (
          <FeedbackBox
            isCorrect={recitationAssessment.isCorrect}
            message={recitationAssessment.message}
            evidence={recitationAssessment.evidence}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.blockGap}>
      <View style={styles.summaryHeroCard}>
        <MascotBuddy state="happy" size={92} speech="今天这节学完啦" />
        <View style={styles.summaryHeroCopy}>
          <Text style={styles.summaryHeroTitle}>这次已经掌握</Text>
          <Text style={styles.summaryHeroText}>
            {latestInputTitle
              ? `基于「${latestInputTitle}」拆出的任务已经完成，今天先把这些重点收好。`
              : "这节课的关键内容已经走完，可以先稳稳收住。"}
          </Text>
        </View>
      </View>

      <View style={styles.summaryTagWrap}>
        {card.payload.mastered?.map((item) => (
          <View key={item} style={styles.summaryTag}>
            <Text style={styles.summaryTagText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.summaryNextCard}>
        <Text style={styles.summaryNextLabel}>下一步</Text>
        <Text style={styles.summaryNextText}>{card.payload.nextReview}</Text>
        <Text style={styles.summaryNextMeta}>完成后会回到首页主线，系统会继续把这次学习接到温和复习。</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blockGap: {
    gap: spacing.sm,
  },
  subLabel: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  contentText: {
    ...textStyles.body,
    lineHeight: 24,
  },
  subText: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  pinyin: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  vocabItem: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  optionWrap: {
    gap: spacing.sm,
  },
  option: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  optionActive: {
    borderColor: colors.primary400,
    backgroundColor: colors.primary100,
  },
  optionTextActive: {
    color: colors.primary700,
    fontWeight: "600",
  },
  recitationQuoteWrap: {
    borderRadius: radius.lg,
    backgroundColor: colors.primary100,
    padding: spacing.md,
  },
  recitationQuote: {
    ...textStyles.title,
    lineHeight: 30,
  },
  recitationActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  recitationSecondaryAction: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary300,
    backgroundColor: colors.primary100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  recitationSecondaryText: {
    ...textStyles.body,
    color: colors.primary700,
    fontWeight: "600",
  },
  recitationPrimaryAction: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary400,
    backgroundColor: colors.bgCard,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  recitationPrimaryActionActive: {
    backgroundColor: colors.primary500,
    borderColor: colors.primary500,
  },
  recitationPrimaryText: {
    ...textStyles.body,
    color: colors.primary700,
    fontWeight: "700",
  },
  recitationPrimaryTextActive: {
    color: "#FFFFFF",
  },
  recitationActionPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  recitationPreviewFallback: {
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  recitationPreviewFallbackText: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  recitationStatusCard: {
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.bgElevated,
    padding: spacing.md,
  },
  recitationStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  recitationMeterTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.borderLight,
    overflow: "hidden",
  },
  recitationMeterFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary500,
  },
  recitationTranscriptLabel: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  recitationTranscriptText: {
    ...textStyles.body,
    lineHeight: 24,
  },
  errorHint: {
    ...textStyles.meta,
    color: colors.error,
  },
  summaryHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primary100,
    padding: spacing.md,
  },
  summaryHeroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryHeroTitle: {
    ...textStyles.title,
  },
  summaryHeroText: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  summaryTagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  summaryTag: {
    borderRadius: 999,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  summaryTagText: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  summaryNextCard: {
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.bgElevated,
    padding: spacing.md,
  },
  summaryNextLabel: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  summaryNextText: {
    ...textStyles.title,
  },
  summaryNextMeta: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
});
