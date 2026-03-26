import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ReviewQueueItem } from "../../api/contracts";
import { AppCard } from "../AppCard";
import { StatusChip } from "../StatusChip";
import { ScreenEmptyState } from "../states/ScreenEmptyState";
import { colors, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";
import {
  getReviewDifficultyLabel,
  getReviewDueText,
  getReviewTypeLabel,
} from "../../domain/reviewPresentation";

type ReviewQueueTab = "today" | "done";

interface ReviewQueuePanelProps {
  showQueueDetails: boolean;
  tab: ReviewQueueTab;
  todayPendingCount: number;
  doneCount: number;
  list: ReviewQueueItem[];
  onToggle: () => void;
  onTabChange: (tab: ReviewQueueTab) => void;
  onPracticeItem: (item: ReviewQueueItem) => void;
  onNavigateHome: () => void;
}

export function ReviewQueuePanel({
  showQueueDetails,
  tab,
  todayPendingCount,
  doneCount,
  list,
  onToggle,
  onTabChange,
  onPracticeItem,
  onNavigateHome,
}: ReviewQueuePanelProps) {
  return (
    <>
      <Pressable
        hitSlop={8}
        onPress={onToggle}
        style={({ pressed }) => [styles.queueDisclosure, pressed && styles.queueDisclosurePressed]}
      >
        <View style={styles.queueDisclosureCopy}>
          <Text style={styles.queueDisclosureTitle}>
            {showQueueDetails ? "收起复习队列与历史" : "查看复习队列与历史"}
          </Text>
          <Text style={styles.queueDisclosureMeta}>
            {todayPendingCount > 0
              ? `待复习 ${todayPendingCount} 项，已完成 ${doneCount} 项`
              : doneCount > 0
                ? `今天已完成 ${doneCount} 项复习，记录都收在这里`
                : "默认先把注意力留给眼前这一题"}
          </Text>
        </View>
        <Ionicons
          name={showQueueDetails ? "chevron-up-outline" : "chevron-down-outline"}
          size={18}
          color={colors.primary500}
        />
      </Pressable>

      {showQueueDetails ? (
        <>
          <View style={styles.segment}>
            <Pressable
              hitSlop={8}
              onPress={() => onTabChange("today")}
              style={[styles.segmentBtn, tab === "today" && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, tab === "today" && styles.segmentTextActive]}>今日待复习</Text>
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() => onTabChange("done")}
              style={[styles.segmentBtn, tab === "done" && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, tab === "done" && styles.segmentTextActive]}>已完成</Text>
            </Pressable>
          </View>

          <View style={styles.queueSectionHead}>
            <Text style={styles.queueSectionTitle}>{tab === "today" ? "手动查看复习队列" : "最近完成记录"}</Text>
            <Text style={styles.queueSectionMeta}>
              {tab === "today"
                ? list.length > 0
                  ? `共 ${list.length} 项待巩固`
                  : "当前没有待复习内容"
                : list.length > 0
                  ? `共 ${list.length} 项已完成`
                  : "完成后会出现在这里"}
            </Text>
          </View>

          <View style={styles.list}>
            {list.length === 0 ? (
              <ScreenEmptyState
                title={tab === "today" ? "今天没有待复习内容" : "暂无已完成复习"}
                message={tab === "today" ? "可以回首页拍照生成新的学习内容。" : "完成后会在这里看到历史记录。"}
                actionLabel={tab === "today" ? "回首页拍照" : undefined}
                onAction={tab === "today" ? onNavigateHome : undefined}
              />
            ) : (
              list.map((item) => (
                <AppCard key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={textStyles.title}>{item.title}</Text>
                    <StatusChip label={getReviewDifficultyLabel(item.difficulty)} tone="primary" />
                  </View>
                  <View style={styles.row}>
                    <StatusChip label={getReviewTypeLabel(item.targetType)} />
                    <Text style={textStyles.meta}>到期：{getReviewDueText(item.dueAt)}</Text>
                  </View>
                  <View style={styles.actionRow}>
                    <StatusChip label={item.status === "pending" ? "待巩固" : "已完成"} />
                    <Pressable hitSlop={8} onPress={() => onPracticeItem(item)}>
                      <Text style={styles.link}>{item.status === "pending" ? "快速复习" : "再练一次"}</Text>
                    </Pressable>
                  </View>
                </AppCard>
              ))
            )}
          </View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  segment: {
    backgroundColor: colors.primary50,
    borderRadius: radius.md,
    padding: spacing.xs,
    flexDirection: "row",
    gap: spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: {
    backgroundColor: colors.bgCard,
  },
  segmentText: {
    ...textStyles.meta,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: colors.textPrimary,
  },
  list: {
    gap: spacing.sm,
  },
  queueDisclosure: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    padding: spacing.sm,
  },
  queueDisclosurePressed: {
    opacity: 0.92,
  },
  queueDisclosureCopy: {
    flex: 1,
    gap: 2,
  },
  queueDisclosureTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  queueDisclosureMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  queueSectionHead: {
    gap: 2,
  },
  queueSectionTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  queueSectionMeta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  itemCard: {
    gap: spacing.sm,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  link: {
    ...textStyles.meta,
    color: colors.primary500,
  },
});
