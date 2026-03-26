import { Image, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../AppButton";
import { AppCard } from "../AppCard";
import { StatusChip } from "../StatusChip";
import {
  ContentInputRecord,
  getContentTypeLabel,
  getInputSourceLabel,
  getReadableFileSizeLabel,
  getRelativeInputTimeLabel,
  hasImagePreview,
} from "../../state/contentInputStore";
import { colors, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface ParentLatestInputCardProps {
  latestInput: ContentInputRecord;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  onHomeAction: () => void;
}

export function ParentLatestInputCard({
  latestInput,
  primaryActionLabel,
  onPrimaryAction,
  onHomeAction,
}: ParentLatestInputCardProps) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={textStyles.title}>最近接住的内容</Text>
        <Text style={styles.meta}>{getRelativeInputTimeLabel(latestInput.createdAt)}</Text>
      </View>
      <View style={styles.focusCard}>
        <Text style={styles.focusLabel}>这次先做</Text>
        <Text style={styles.focusTitle}>{latestInput.recommendedEntryStep}</Text>
        <Text style={styles.focusMeta}>{latestInput.routeLabel} · {latestInput.primaryChallenge}</Text>
      </View>
      <View style={styles.inputPreviewRow}>
        {hasImagePreview(latestInput) ? (
          <Image
            source={{ uri: latestInput.previewUri ?? undefined }}
            style={styles.inputPreview}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.inputPreviewFallback}>
            <Text style={styles.previewFallbackText}>
              {getContentTypeLabel(latestInput.contentType)}
            </Text>
          </View>
        )}
        <View style={styles.inputPreviewContent}>
          <Text style={textStyles.body}>{latestInput.title}</Text>
          {latestInput.fileName ? (
            <Text style={styles.meta} numberOfLines={1}>
              {latestInput.fileName}
              {latestInput.fileSize ? ` · ${getReadableFileSizeLabel(latestInput.fileSize)}` : ""}
            </Text>
          ) : null}
          <Text style={styles.meta}>{latestInput.summary}</Text>
          {latestInput.recognizedTextSnippet ? (
            <Text style={styles.snippetText}>识别到：{latestInput.recognizedTextSnippet}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.metaRow}>
        <StatusChip label={getInputSourceLabel(latestInput.source)} tone="primary" />
        <StatusChip label={getContentTypeLabel(latestInput.contentType)} />
        <StatusChip label={`${latestInput.generatedTaskCount} 步任务`} tone="accent" />
      </View>
      <View style={styles.actionButtons}>
        <AppButton label={primaryActionLabel} onPress={onPrimaryAction} />
        <AppButton label="回首页拍照" variant="secondary" onPress={onHomeAction} />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  inputPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inputPreview: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.primary100,
  },
  inputPreviewFallback: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.primary100,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  previewFallbackText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  inputPreviewContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  focusCard: {
    borderRadius: 16,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  focusLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  focusTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  focusMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  meta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  snippetText: {
    ...textStyles.caption,
    color: colors.primary600,
  },
});
