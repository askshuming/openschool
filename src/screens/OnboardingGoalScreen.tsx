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
      title="先提升哪方面能力？"
      subtitle="先选一个最想提升的方向，后续可在家长页调整。"
      icon="bulb-outline"
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
            <Ionicons name="chevron-forward" size={18} color={colors.primary500} />
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
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  optionPressed: {
    opacity: 0.88,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
});
