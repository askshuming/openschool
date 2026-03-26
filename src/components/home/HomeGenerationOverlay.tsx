import { ActivityIndicator, Animated, Image, Modal, StyleSheet, Text, View } from "react-native";
import { MascotBuddy } from "../MascotBuddy";
import { colors, radius, spacing } from "../../design/tokens";
import { textStyles } from "../../design/theme";
import { ContentInputRecord, hasImagePreview } from "../../state/contentInputStore";

interface HomeGenerationOverlayProps {
  visible: boolean;
  animationValue: Animated.Value;
  activeInput: ContentInputRecord | null;
}

export function HomeGenerationOverlay({
  visible,
  animationValue,
  activeInput,
}: HomeGenerationOverlayProps) {
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => undefined}>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: animationValue,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                {
                  scale: animationValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.97, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <MascotBuddy state="teacher" size={92} />

          <View style={styles.copyWrap}>
            <Text style={styles.title}>Thinking...</Text>
            <Text style={styles.subtitle}>正在生成学习内容</Text>
          </View>

          {activeInput ? (
            <View style={styles.inputCard}>
              {hasImagePreview(activeInput) ? (
                <Image source={{ uri: activeInput.previewUri ?? undefined }} style={styles.preview} resizeMode="cover" />
              ) : (
                <View style={styles.previewFallback} />
              )}
              <View style={styles.inputCopy}>
                <Text style={styles.inputLabel}>刚拍的这一页</Text>
                <Text style={styles.inputTitle} numberOfLines={1}>
                  {activeInput.title}
                </Text>
              </View>
            </View>
          ) : null}

          <ActivityIndicator size="large" color={colors.primary600} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(18, 35, 28, 0.34)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: "100%",
    borderRadius: 32,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.md,
    shadowColor: colors.primary700,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
  copyWrap: {
    alignItems: "center",
    gap: spacing.xxs,
  },
  title: {
    ...textStyles.title,
    fontSize: 24,
    color: colors.textPrimary,
  },
  subtitle: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  inputCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    padding: spacing.sm,
  },
  preview: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary100,
  },
  previewFallback: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary100,
  },
  inputCopy: {
    flex: 1,
    gap: 2,
  },
  inputLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  inputTitle: {
    ...textStyles.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
