import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AppCard } from "../AppCard";
import { StatusChip } from "../StatusChip";
import { ContentInputRecord, getContentTypeLabel, getReadableFileSizeLabel, hasImagePreview } from "../../state/contentInputStore";
import { colors, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface LearningFlowCardProps {
  showDetails: boolean;
  onToggle: () => void;
  generationSourceLabel: string;
  currentVisibleStep: number;
  visibleTotalSteps: number;
  childNickname?: string;
  latestInput: ContentInputRecord | null;
  currentCardTitle: string;
  focusLabel: string;
  readingLevelHint: string;
  currentStrategy: string;
}

export function LearningFlowCard({
  showDetails,
  onToggle,
  generationSourceLabel,
  currentVisibleStep,
  visibleTotalSteps,
  childNickname,
  latestInput,
  currentCardTitle,
  focusLabel,
  readingLevelHint,
  currentStrategy,
}: LearningFlowCardProps) {
  const collapsedHeadline = latestInput
    ? `这节先从「${latestInput.recommendedEntryStep}」开始`
    : `先学「${currentCardTitle}」`;
  const collapsedMeta = latestInput
    ? `${latestInput.routeLabel} · 不用自己判断题型`
    : `当前在学「${currentCardTitle}」`;
  const expandedTitle = childNickname
    ? `${childNickname} 的${latestInput?.routeLabel ?? "当前学习路线"}`
    : latestInput?.routeLabel ?? "当前学习路线";

  return (
    <AppCard style={styles.flowCard}>
      <Pressable
        hitSlop={8}
        onPress={onToggle}
        style={({ pressed }) => [
          showDetails ? styles.flowSummaryExpanded : styles.flowSummaryCollapsed,
          pressed && styles.flowSummaryPressed,
        ]}
      >
        {showDetails ? (
          <>
            <View style={styles.flowSummaryCopy}>
              <View style={styles.flowChipRow}>
                <StatusChip label={generationSourceLabel} tone="primary" />
                <StatusChip label={`${currentVisibleStep}/${visibleTotalSteps}`} tone="accent" />
              </View>
              <Text style={styles.flowTitle}>{expandedTitle}</Text>
              <Text style={styles.flowText}>
                {latestInput
                  ? `基于「${latestInput.title}」已经安排好了。跟着当前步骤往下做就行。`
                  : `当前先学「${currentCardTitle}」，其他路线说明默认收起。`}
              </Text>
            </View>
            <View style={styles.flowToggle}>
              <Text style={styles.flowToggleText}>收起</Text>
              <Ionicons name="chevron-up-outline" size={18} color={colors.primary500} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.flowCollapsedCopy}>
              <StatusChip label={`${currentVisibleStep}/${visibleTotalSteps}`} tone="accent" />
              {latestInput?.routeLabel ? <StatusChip label={latestInput.routeLabel} tone="primary" /> : null}
            </View>
            <View style={styles.flowCollapsedBody}>
              <Text style={styles.flowCollapsedTitle} numberOfLines={1}>
                {collapsedHeadline}
              </Text>
              <Text style={styles.flowCollapsedText} numberOfLines={1}>
                {collapsedMeta}
              </Text>
            </View>
            <View style={styles.flowToggleInline}>
              <Text style={styles.flowToggleText}>看原因</Text>
              <Ionicons name="chevron-down-outline" size={18} color={colors.primary500} />
            </View>
          </>
        )}
      </Pressable>

      {showDetails ? (
        <View style={styles.flowDetails}>
          <View style={styles.flowReasonCard}>
            <Text style={styles.flowReasonLabel}>为什么先从这里开始</Text>
            <Text style={styles.flowReasonText}>
              {latestInput
                ? `${latestInput.primaryChallenge}。所以先做「${latestInput.recommendedEntryStep}」，当前正在学「${currentCardTitle}」。`
                : `${focusLabel}优先 · ${readingLevelHint} · ${currentStrategy}`}
            </Text>
          </View>

          {latestInput ? (
            <View style={styles.flowInfoGrid}>
              <View style={styles.flowInfoCell}>
                <Text style={styles.flowInfoLabel}>这次输入</Text>
                <Text style={styles.flowInfoValue} numberOfLines={1}>
                  {latestInput.title}
                </Text>
              </View>
              <View style={styles.flowInfoCell}>
                <Text style={styles.flowInfoLabel}>当前第一步</Text>
                <Text style={styles.flowInfoValue} numberOfLines={1}>
                  {latestInput.recommendedEntryStep}
                </Text>
              </View>
            </View>
          ) : null}

          {latestInput ? (
            <View style={styles.generatedSourceCard}>
              <View style={styles.generatedSourcePreviewWrap}>
                <Text style={styles.generatedSourceLabel}>本次输入</Text>
                {hasImagePreview(latestInput) ? (
                  <Image
                    source={{ uri: latestInput.previewUri ?? undefined }}
                    style={styles.generatedSourcePreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.generatedSourcePreviewFallback}>
                    <Text style={styles.generatedSourcePreviewText}>
                      {getContentTypeLabel(latestInput.contentType)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.generatedSourceContent}>
                <Text style={styles.generatedSourceTitle} numberOfLines={1}>
                  {latestInput.title}
                </Text>
                {latestInput.fileName ? (
                  <Text style={styles.generatedSourceMeta} numberOfLines={1}>
                    {latestInput.fileName}
                    {latestInput.fileSize ? ` · ${getReadableFileSizeLabel(latestInput.fileSize)}` : ""}
                  </Text>
                ) : null}
                {latestInput.recognizedTextSnippet ? (
                  <Text style={styles.generatedSourceSnippet} numberOfLines={2}>
                    识别到：{latestInput.recognizedTextSnippet}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  flowCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  flowSummaryExpanded: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  flowSummaryCollapsed: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  flowSummaryPressed: {
    opacity: 0.92,
  },
  flowSummaryCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  flowChipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  flowTitle: {
    ...textStyles.title,
    fontSize: 18,
    lineHeight: 24,
  },
  flowText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  flowToggle: {
    alignItems: "center",
    gap: 2,
  },
  flowToggleInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingTop: 2,
  },
  flowToggleText: {
    ...textStyles.meta,
    color: colors.primary500,
  },
  flowCollapsedCopy: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  flowCollapsedBody: {
    flex: 1,
    gap: 2,
  },
  flowCollapsedTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  flowCollapsedText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  flowDetails: {
    gap: spacing.sm,
  },
  flowInfoGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  flowInfoCell: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  flowInfoLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  flowInfoValue: {
    ...textStyles.body,
    color: colors.textPrimary,
  },
  generatedSourceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.sm,
  },
  generatedSourcePreviewWrap: {
    gap: spacing.xxs,
  },
  generatedSourceLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  generatedSourcePreview: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.primary100,
  },
  generatedSourcePreviewFallback: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.primary100,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  generatedSourcePreviewText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  generatedSourceContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  generatedSourceTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  generatedSourceMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  generatedSourceSnippet: {
    ...textStyles.caption,
    color: colors.primary600,
  },
  flowReasonCard: {
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  flowReasonLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  flowReasonText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
