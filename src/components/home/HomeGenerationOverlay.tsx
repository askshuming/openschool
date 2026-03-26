import { Ionicons } from "@expo/vector-icons";
import { Animated, Image, Modal, StyleSheet, Text, View } from "react-native";
import { MascotBuddy } from "../MascotBuddy";
import { StatusChip } from "../StatusChip";
import { colors, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";
import {
  ContentInputRecord,
  getContentTypeLabel,
  getReadableFileSizeLabel,
  hasImagePreview,
} from "../../state/contentInputStore";

interface GenerationStep {
  title: string;
  detail: string;
}

interface HomeGenerationOverlayProps {
  visible: boolean;
  animationValue: Animated.Value;
  currentStepIndex: number;
  steps: GenerationStep[];
  activeInput: ContentInputRecord | null;
  sourceLabel: string;
}

export function HomeGenerationOverlay({
  visible,
  animationValue,
  currentStepIndex,
  steps,
  activeInput,
  sourceLabel,
}: HomeGenerationOverlayProps) {
  const stepCount = Math.max(steps.length, 1);
  const activeStepLabel = `${Math.min(currentStepIndex + 1, stepCount)}/${stepCount}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <Animated.View
        style={[
          styles.generationOverlay,
          {
            opacity: animationValue,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.generationSheet,
            {
              transform: [
                {
                  translateY: animationValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [28, 0],
                  }),
                },
                {
                  scale: animationValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.generationHandle} />
          <View style={styles.generationHeader}>
            <Text style={styles.generationTitle}>正在准备这一页的第一步</Text>
            <View style={styles.generationHeaderAside}>
              <MascotBuddy
                state={currentStepIndex >= 2 ? "wow" : "teacher"}
                size={68}
                speech={currentStepIndex >= 2 ? "马上开始" : "我先接住这一页"}
              />
              <StatusChip label={activeStepLabel} tone="accent" />
            </View>
          </View>
          <Text style={styles.generationLead}>
            {activeInput
              ? `${sourceLabel}已收到「${activeInput.title}」，马上会直接进入「${activeInput.recommendedEntryStep}」。`
              : "这一页已经收到，马上会直接进入最该开始的第一步。"}
          </Text>

          {activeInput ? (
            <View style={styles.generationInputCard}>
              {hasImagePreview(activeInput) ? (
                <Image
                  source={{ uri: activeInput.previewUri ?? undefined }}
                  style={styles.generationInputPreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.generationInputPreviewFallback}>
                  <Ionicons
                    name={activeInput.contentType === "pdf" ? "document-text-outline" : "image-outline"}
                    size={24}
                    color={colors.primary500}
                  />
                </View>
              )}
              <View style={styles.generationInputContent}>
                <Text style={styles.generationInputLabel}>本次输入</Text>
                <Text style={styles.generationInputTitle} numberOfLines={1}>
                  {activeInput.title}
                </Text>
                <Text style={styles.generationInputMeta} numberOfLines={1}>
                  {getContentTypeLabel(activeInput.contentType)} · {activeInput.recognizedGradeLabel}
                  {activeInput.fileSize ? ` · ${getReadableFileSizeLabel(activeInput.fileSize)}` : ""}
                </Text>
                {activeInput.recognizedTextSnippet ? (
                  <Text style={styles.generationInputSnippet} numberOfLines={2}>
                    这页内容：{activeInput.recognizedTextSnippet}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {steps.map((item, index) => {
            const state =
              index < currentStepIndex ? "done" : index === currentStepIndex ? "active" : "idle";
            return (
              <View key={item.title} style={styles.generationStepRow}>
                <View
                  style={[
                    styles.generationStepDot,
                    state === "done" && styles.generationStepDotDone,
                    state === "active" && styles.generationStepDotActive,
                  ]}
                >
                  {state === "done" ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.generationStepIndexText,
                        state === "active" && styles.generationStepIndexTextActive,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
                <View style={styles.generationStepContent}>
                  <Text style={styles.generationStepTitle}>{item.title}</Text>
                  <Text style={styles.generationStepText}>{item.detail}</Text>
                </View>
              </View>
            );
          })}

          <View style={styles.generationPreview}>
            <Text style={styles.generationPreviewMeta}>马上先做这一小步</Text>
            <Text style={styles.generationPreviewTitle}>
              {activeInput ? activeInput.recommendedEntryStep : "先判断这页卡在哪里"}
            </Text>
            <Text style={styles.generationPreviewText}>
              {activeInput
                ? `${activeInput.primaryChallenge} · 后面的短练习和温和复习会自动接上`
                : "系统会先看清这一页，再安排正确的第一步。"}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  generationOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 36, 29, 0.26)",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  generationSheet: {
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: spacing.sm,
    shadowColor: colors.primary700,
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 8,
  },
  generationHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.borderLight,
  },
  generationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  generationHeaderAside: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  generationTitle: {
    ...textStyles.title,
    flex: 1,
    fontSize: 17,
  },
  generationLead: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  generationInputCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    padding: spacing.sm,
  },
  generationInputPreview: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.primary100,
  },
  generationInputPreviewFallback: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.primary100,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  generationInputContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  generationInputLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  generationInputTitle: {
    ...textStyles.title,
    fontSize: 17,
  },
  generationInputMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  generationInputSnippet: {
    ...textStyles.caption,
    color: colors.primary600,
  },
  generationStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  generationStepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bgBase,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  generationStepDotDone: {
    backgroundColor: colors.primary500,
    borderColor: colors.primary500,
  },
  generationStepDotActive: {
    backgroundColor: colors.primary100,
    borderColor: colors.primary500,
  },
  generationStepIndexText: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  generationStepIndexTextActive: {
    color: colors.primary500,
  },
  generationStepContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  generationStepTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  generationStepText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  generationPreview: {
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  generationPreviewMeta: {
    ...textStyles.meta,
    color: colors.primary500,
  },
  generationPreviewTitle: {
    ...textStyles.title,
    fontSize: 17,
  },
  generationPreviewText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
});
