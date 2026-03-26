import { StyleSheet, Text, View } from "react-native";
import { ReviewQueueItem } from "../../api/contracts";
import { AppButton } from "../AppButton";
import { AppCard } from "../AppCard";
import { MascotBuddy } from "../MascotBuddy";
import { StatusChip } from "../StatusChip";
import { colors, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";
import {
  getReviewCoachHint,
  getReviewCoachTitle,
  getReviewDifficultyLabel,
  getReviewDueText,
  getReviewTypeLabel,
} from "../../domain/reviewPresentation";

interface ReviewHeroCardProps {
  pendingCount: number;
  doneCount: number;
  nextPendingItem: ReviewQueueItem | null;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}

export function ReviewHeroCard({
  pendingCount,
  doneCount,
  nextPendingItem,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
}: ReviewHeroCardProps) {
  const focusTitle = nextPendingItem
    ? getReviewCoachTitle(nextPendingItem.targetType)
    : `已完成 ${doneCount} 项复习，今天先到这里`;
  const focusHint = nextPendingItem
    ? getReviewCoachHint(nextPendingItem.targetType)
    : "如果还要推进新内容，直接回首页拍不会的那一页。";

  return (
    <AppCard style={styles.card}>
      <View style={styles.inner}>
        <MascotBuddy
          state={pendingCount > 0 ? "teacher" : "happy"}
          size={92}
          speech={pendingCount > 0 ? "今天先做眼前这一题" : "今天的复习已经收好了"}
        />
        <View style={styles.copy}>
          <View style={styles.rowTop}>
            <Text style={textStyles.h2}>先复习眼前这一题</Text>
            <StatusChip label={pendingCount > 0 ? `${pendingCount} 待复习` : "已清空"} tone={pendingCount > 0 ? "accent" : "primary"} />
          </View>
          <Text style={styles.body}>
            {pendingCount > 0
              ? "不用一次做完。先把这一题收住，做完后我再决定要不要继续下一题。"
              : "今天需要巩固的内容已经清空。下一次学习从首页拍照进入就行。"}
          </Text>
          {nextPendingItem ? (
            <View style={styles.focusWrap}>
              <View style={styles.focusHeader}>
                <Text style={styles.focusEyebrow}>现在先做</Text>
                <View style={styles.focusChipRow}>
                  <StatusChip label={getReviewTypeLabel(nextPendingItem.targetType)} tone="primary" />
                  <StatusChip label={getReviewDifficultyLabel(nextPendingItem.difficulty)} />
                </View>
              </View>
              <Text style={styles.focusTitle}>{focusTitle}</Text>
              <Text style={styles.focusTask} numberOfLines={1}>
                {nextPendingItem.title}
              </Text>
              <Text style={styles.focusMeta}>
                {focusHint} · 到期：{getReviewDueText(nextPendingItem.dueAt)}
              </Text>
            </View>
          ) : (
            <View style={styles.focusWrap}>
              <Text style={styles.focusEyebrow}>今天的结果</Text>
              <Text style={styles.focusTitle}>{focusTitle}</Text>
              <Text style={styles.focusMeta}>{focusHint}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.actionCell}>
          <AppButton label={primaryActionLabel} onPress={onPrimaryAction} />
        </View>
        <View style={styles.actionCell}>
          <AppButton label={secondaryActionLabel} onPress={onSecondaryAction} variant="secondary" />
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  body: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  focusWrap: {
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  focusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  focusChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  focusEyebrow: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  focusTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  focusTask: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  focusMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionCell: {
    flex: 1,
  },
});
