import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View, Image } from "react-native";
import { AppButton } from "../AppButton";
import { colors, radius, shadow, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";
import {
  ContentInputRecord,
  getContentTypeLabel,
  getReadableFileSizeLabel,
  hasImagePreview,
} from "../../state/contentInputStore";

interface HomeCaptureConfirmSheetProps {
  visible: boolean;
  previewInput: ContentInputRecord | null;
  retakeLabel: string;
  onRetake: () => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function HomeCaptureConfirmSheet({
  visible,
  previewInput,
  retakeLabel,
  onRetake,
  onConfirm,
  onClose,
}: HomeCaptureConfirmSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>拍好了，就从这一页开始</Text>
          <Text style={styles.subtitle}>只要这页没拍错，下面就直接开始。不用自己判断题型。</Text>

          {previewInput ? (
            <View style={styles.previewCard}>
              {hasImagePreview(previewInput) ? (
                <Image source={{ uri: previewInput.previewUri ?? undefined }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={styles.previewFallback}>
                  <Ionicons
                    name={previewInput.contentType === "pdf" ? "document-text-outline" : "image-outline"}
                    size={28}
                    color={colors.primary500}
                  />
                </View>
              )}

              <View style={styles.previewContent}>
                <Text style={styles.previewLabel}>刚拍的这一页</Text>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {previewInput.title}
                </Text>
                <Text style={styles.previewMeta} numberOfLines={1}>
                  {getContentTypeLabel(previewInput.contentType)} · {previewInput.recognizedGradeLabel}
                  {previewInput.fileSize ? ` · ${getReadableFileSizeLabel(previewInput.fileSize)}` : ""}
                </Text>
                <Text style={styles.previewBody} numberOfLines={2}>
                  先做「{previewInput.recommendedEntryStep}」，后面的短练习和温和复习会自动接上。
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.checklist}>
            <View style={styles.checkItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary600} />
              <Text style={styles.checkText}>不用先判断是课文、阅读题、作文题还是字词页</Text>
            </View>
            <View style={styles.checkItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary600} />
              <Text style={styles.checkText}>进入后会直接从这页最该开始的第一步学起</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <AppButton label={retakeLabel} onPress={onRetake} variant="secondary" />
            <AppButton label="就用这一页开始" onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(21, 36, 29, 0.26)",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  sheet: {
    borderRadius: 28,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    ...shadow.modal,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.borderLight,
  },
  title: {
    ...textStyles.title,
    fontSize: 20,
  },
  subtitle: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  previewCard: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
  },
  previewImage: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.primary100,
  },
  previewFallback: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.primary100,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  previewContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  previewLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  previewTitle: {
    ...textStyles.title,
    fontSize: 17,
  },
  previewMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  previewBody: {
    ...textStyles.caption,
    color: colors.textPrimary,
  },
  checklist: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  checkText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  actions: {
    gap: spacing.xs,
  },
});
