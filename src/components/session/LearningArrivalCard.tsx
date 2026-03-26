import { Image, StyleSheet, Text, View } from "react-native";
import { AppCard } from "../AppCard";
import { MascotBuddy } from "../MascotBuddy";
import { StatusChip } from "../StatusChip";
import {
  ContentInputRecord,
  getContentTypeLabel,
  hasImagePreview,
} from "../../state/contentInputStore";
import { colors, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";

interface LearningArrivalCardProps {
  latestInput: ContentInputRecord;
  childNickname?: string;
}

export function LearningArrivalCard({ latestInput, childNickname }: LearningArrivalCardProps) {
  const title = childNickname
    ? `${childNickname}，这一页已经接住了`
    : "这一页已经接住了";
  const arrivalBody = `你现在只要先做「${latestInput.recommendedEntryStep}」。后面的短练习和温和复习会自动接上。`;

  return (
    <AppCard style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>刚拍下的这一页</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{arrivalBody}</Text>
        </View>
        <MascotBuddy state="teacher" size={72} speech="我先带第一步" />
      </View>

      <View style={styles.sourceCard}>
        {hasImagePreview(latestInput) ? (
          <Image source={{ uri: latestInput.previewUri ?? undefined }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.previewFallback}>
            <Text style={styles.previewFallbackText}>{getContentTypeLabel(latestInput.contentType)}</Text>
          </View>
        )}
        <View style={styles.sourceCopy}>
          <View style={styles.chipRow}>
            <StatusChip label={latestInput.routeLabel} tone="primary" />
            <StatusChip label={`现在先做`} tone="accent" />
          </View>
          <Text style={styles.sourceTitle} numberOfLines={1}>
            {latestInput.title}
          </Text>
          <Text style={styles.sourceMeta} numberOfLines={2}>
            {getContentTypeLabel(latestInput.contentType)} · {latestInput.recommendedEntryStep} · {latestInput.primaryChallenge}
          </Text>
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
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
  eyebrow: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  title: {
    ...textStyles.title,
    fontSize: 20,
    lineHeight: 26,
  },
  body: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sourceCard: {
    flexDirection: "row",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.primary200,
    padding: spacing.sm,
  },
  preview: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.primary100,
  },
  previewFallback: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
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
  sourceCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  sourceTitle: {
    ...textStyles.title,
    fontSize: 17,
    lineHeight: 22,
  },
  sourceMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
});
