import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusChip } from "../StatusChip";
import { colors, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";
import { ContentInputRecord } from "../../state/contentInputStore";

type SupportActionIcon =
  | "play-circle-outline"
  | "refresh-circle-outline"
  | "person-circle-outline";

interface HomeCaptureSupportPanelProps {
  latestInput: ContentInputRecord | null;
  stageSupportTitle: string;
  stageSupportMeta: string;
  stageSupportSummary: string;
  supportedInputLabels: readonly string[];
  childGradeLabel: string;
  focusLabel: string;
  onUploadPress: () => void;
  secondaryAction: {
    title: string;
    icon: SupportActionIcon;
    onPress: () => void;
  };
}

export function HomeCaptureSupportPanel({
  latestInput,
  stageSupportTitle,
  stageSupportMeta,
  stageSupportSummary,
  supportedInputLabels,
  childGradeLabel,
  focusLabel,
  onUploadPress,
  secondaryAction,
}: HomeCaptureSupportPanelProps) {
  return (
    <>
      <View style={styles.captureStage}>
        <View style={styles.heroPromiseRow}>
          <View style={styles.heroPromiseIcon}>
            <Ionicons name="sparkles-outline" size={16} color={colors.primary600} />
          </View>
          <Text style={styles.heroPromiseText}>你拍，系统识别内容并匹配学习路线，不需要手动找课。</Text>
        </View>

        <View style={styles.captureInputCompact}>
          <View style={styles.captureInputCompactIcon}>
            <Ionicons
              name={
                latestInput
                  ? latestInput.contentType === "pdf"
                    ? "document-text-outline"
                    : "scan-outline"
                  : "layers-outline"
              }
              size={18}
              color={colors.primary500}
            />
          </View>
          <View style={styles.captureInputCompactCopy}>
            <Text style={styles.captureInputTitle} numberOfLines={1}>
              {stageSupportTitle}
            </Text>
            <Text style={styles.captureInputMeta} numberOfLines={1}>
              {stageSupportMeta}
            </Text>
            <Text style={styles.captureInputSummary} numberOfLines={1}>
              {latestInput ? stageSupportSummary : "教材页、练习题、板书、图片都能直接拍。"}
            </Text>
          </View>
          {latestInput ? (
            <StatusChip label={`${latestInput.generatedTaskCount} 步`} tone="accent" />
          ) : (
            <View style={styles.captureInputChipRow}>
              {supportedInputLabels.slice(0, 2).map((item) => (
                <View key={item} style={styles.captureInputMiniChip}>
                  <Text style={styles.captureInputMiniChipText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.captureOutcomeCard}>
        <Text style={styles.captureOutcomeTitle}>拍完马上得到</Text>
        <View style={styles.captureOutcomeInline}>
          <View style={styles.captureOutcomeBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary600} />
            <Text style={styles.captureOutcomeBadgeText}>讲解</Text>
          </View>
          <View style={styles.captureOutcomeBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary600} />
            <Text style={styles.captureOutcomeBadgeText}>短练习</Text>
          </View>
          <View style={styles.captureOutcomeBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary600} />
            <Text style={styles.captureOutcomeBadgeText}>温和复习</Text>
          </View>
        </View>
        <Text style={styles.captureOutcomeMeta}>按 {childGradeLabel} · {focusLabel} 自动适配</Text>
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
  heroPromiseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.74)",
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
  captureStage: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.xl,
    backgroundColor: "transparent",
  },
  captureInputCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: colors.primary500,
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 1,
  },
  captureInputCompactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  captureInputCompactCopy: {
    flex: 1,
    gap: 2,
  },
  captureInputTitle: {
    ...textStyles.title,
    color: colors.primary600,
    fontSize: 16,
  },
  captureInputMeta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  captureInputChipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  captureInputMiniChip: {
    borderRadius: radius.pill,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  captureInputMiniChipText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  captureInputSummary: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  captureOutcomeCard: {
    alignSelf: "center",
    width: "100%",
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    shadowColor: colors.primary500,
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 1,
  },
  captureOutcomeTitle: {
    ...textStyles.meta,
    color: colors.primary600,
    fontSize: 13,
  },
  captureOutcomeInline: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  captureOutcomeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  captureOutcomeBadgeText: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  captureOutcomeMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
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
