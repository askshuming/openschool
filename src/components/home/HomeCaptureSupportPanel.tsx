import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusChip } from "../StatusChip";
import { colors, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";
import {
  ContentInputRecord,
  getContentTypeLabel,
  getRelativeInputTimeLabel,
} from "../../state/contentInputStore";

type SupportActionIcon =
  | "play-circle-outline"
  | "refresh-circle-outline"
  | "person-circle-outline";

interface HomeCaptureSupportPanelProps {
  latestInput: ContentInputRecord | null;
  childGradeLabel: string;
  focusLabel: string;
  onUploadPress: () => void;
  secondaryAction: {
    title: string;
    icon: SupportActionIcon;
    onPress: () => void;
  };
}

const routeScenarios = [
  {
    routeKind: "text_reading",
    tag: "课文页",
    title: "拍课文页",
    body: "系统先带读重点句",
  },
  {
    routeKind: "reading_quiz",
    tag: "阅读题",
    title: "拍阅读题",
    body: "系统先带找题干关键词",
  },
  {
    routeKind: "writing_prompt",
    tag: "作文题",
    title: "拍作文题",
    body: "系统先带看清要求",
  },
  {
    routeKind: "vocab_foundation",
    tag: "字词页",
    title: "拍字词页",
    body: "系统先带看懂字词",
  },
] as const;

export function HomeCaptureSupportPanel({
  latestInput,
  childGradeLabel,
  focusLabel,
  onUploadPress,
  secondaryAction,
}: HomeCaptureSupportPanelProps) {
  const activeRouteKind = latestInput?.routeKind ?? null;

  return (
    <>
      <View style={styles.captureStage}>
        <View style={styles.heroPromiseRow}>
          <View style={styles.heroPromiseIcon}>
            <Ionicons name="sparkles-outline" size={16} color={colors.primary600} />
          </View>
          <Text style={styles.heroPromiseText}>孩子卡在哪一页，就拍哪一页。先学什么，我来安排。</Text>
        </View>

        <View style={styles.routeFocusCard}>
          <View style={styles.routeFocusTop}>
            <Text style={styles.routeFocusLabel}>{latestInput ? "拍完先走这一步" : "这 4 类都能直接拍"}</Text>
            {latestInput ? <StatusChip label={latestInput.routeLabel} tone="primary" /> : null}
          </View>
          <Text style={styles.routeFocusTitle}>
            {latestInput ? `先做「${latestInput.recommendedEntryStep}」` : "不会的这一页，先拍下来"}
          </Text>
          <Text style={styles.routeFocusBody}>
            {latestInput
              ? `刚拍：${latestInput.title} · ${latestInput.primaryChallenge}`
              : `${childGradeLabel} · ${focusLabel}优先，不用先判断类型。`}
          </Text>
        </View>

        <View style={styles.routeGrid}>
          {routeScenarios.map((item) => {
            const active = item.routeKind === activeRouteKind;
            return (
              <View key={item.routeKind} style={[styles.routeTile, active && styles.routeTileActive]}>
                <View style={styles.routeTileTop}>
                  <Text style={[styles.routeTileTag, active && styles.routeTileTagActive]}>{item.tag}</Text>
                  {active ? <StatusChip label="已匹配" tone="accent" /> : null}
                </View>
                <Text style={[styles.routeTileTitle, active && styles.routeTileTitleActive]}>{item.title}</Text>
                <Text style={styles.routeTileBody}>{item.body}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.captureOutcomeStrip}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary600} />
          <Text style={styles.captureOutcomeStripText}>拍完自动接上：讲解 · 短练习 · 温和复习。</Text>
        </View>
      </View>

      <View style={styles.captureAssistRow}>
        <Pressable
          hitSlop={8}
          onPress={onUploadPress}
          style={({ pressed }) => [styles.captureAssistPill, pressed && styles.captureAssistPillPressed]}
        >
          <Ionicons name="cloud-upload-outline" size={16} color={colors.primary500} />
          <Text style={styles.captureAssistText}>上传内容</Text>
        </Pressable>
        <Pressable
          hitSlop={8}
          onPress={secondaryAction.onPress}
          style={({ pressed }) => [styles.captureAssistPill, pressed && styles.captureAssistPillPressed]}
        >
          <Ionicons name={secondaryAction.icon} size={16} color={colors.primary500} />
          <Text style={styles.captureAssistText}>{secondaryAction.title}</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  captureStage: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.xl,
    backgroundColor: "transparent",
  },
  heroPromiseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.76)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  heroPromiseIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  heroPromiseText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  routeFocusCard: {
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: colors.primary200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    shadowColor: colors.primary500,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  routeFocusTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  routeFocusLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  routeFocusTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
    fontSize: 19,
  },
  routeFocusBody: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  routeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  routeTile: {
    width: "48.5%",
    minHeight: 92,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: "rgba(255,255,255,0.82)",
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  routeTileActive: {
    backgroundColor: colors.primary50,
    borderColor: colors.primary300,
  },
  routeTileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  routeTileTag: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  routeTileTagActive: {
    color: colors.primary700,
  },
  routeTileTitle: {
    ...textStyles.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  routeTileTitleActive: {
    color: colors.primary700,
  },
  routeTileBody: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  captureOutcomeStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  captureOutcomeStripText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  captureAssistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: "82%",
    alignSelf: "center",
  },
  captureAssistPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  captureAssistPillPressed: {
    transform: [{ scale: 0.988 }],
    opacity: 0.92,
  },
  captureAssistText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
});
