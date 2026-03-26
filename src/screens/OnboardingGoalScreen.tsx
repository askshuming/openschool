import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { OnboardingScaffold } from "../components/OnboardingScaffold";
import { colors, radius, spacing } from "../design/tokens";
import { textStyles } from "../design/theme";
import { RootStackParamList, OnboardingGoal } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingGoal">;

const goals: Array<{
  key: OnboardingGoal;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "reading", label: "阅读", desc: "读懂内容和题意", icon: "book-outline" },
  { key: "writing", label: "写作", desc: "提升组织与表达", icon: "create-outline" },
  { key: "expression", label: "表达", desc: "口头复述更清晰", icon: "mic-outline" },
  { key: "comprehensive", label: "综合", desc: "整体语文能力提升", icon: "sparkles-outline" },
];

export function OnboardingGoalScreen({ navigation, route }: Props) {
  const { grade } = route.params;
  return (
    <OnboardingScaffold
      step="第 2/4 步"
      stepIndex={2}
      title="先提升哪方面能力"
      subtitle="先选一个现在最想改善的方向，后面拍照会优先按这个目标安排路线。"
      icon="bulb-outline"
      mascotState="wow"
      mascotSpeech="先定方向，我会把每一页先带到最关键的第一步。"
      highlights={["先选一个最想提升的", "后面随时能调整"]}
      cardTitle="这段时间更想先改善"
      cardSubtitle="不用全选。先抓一个方向，体验会更清楚。"
    >
      <View style={styles.list}>
        {goals.map((item) => (
          <Pressable
            key={item.key}
            hitSlop={8}
            onPress={() =>
              navigation.navigate("OnboardingLevel", {
                grade,
                goal: item.key,
              })
            }
            style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={20} color={colors.primary600} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.optionTitle}>{item.label}</Text>
              <Text style={styles.optionDesc}>{item.desc}</Text>
            </View>
            <View style={styles.trailingWrap}>
              <Text style={styles.trailingText}>先提升</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary500} />
            </View>
          </Pressable>
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.xs,
  },
  optionRow: {
    minHeight: 82,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  optionPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary100,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  optionTitle: {
    ...textStyles.title,
  },
  optionDesc: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  trailingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    minHeight: 28,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary50,
  },
  trailingText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
});
