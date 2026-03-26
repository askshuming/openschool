import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { OnboardingScaffold } from "../components/OnboardingScaffold";
import { colors, radius, spacing } from "../design/tokens";
import { textStyles } from "../design/theme";
import { RootStackParamList, OnboardingLevel } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingLevel">;

const levels: Array<{
  key: OnboardingLevel;
  label: string;
  desc: string;
}> = [
  { key: "support_needed", label: "需要更多陪练", desc: "基础还不稳定，先从简单任务开始。" },
  { key: "steady", label: "中等水平", desc: "大部分内容能完成，需要适度强化。" },
  { key: "advanced", label: "比较熟练", desc: "希望更有挑战，提升综合能力。" },
];

export function OnboardingLevelScreen({ navigation, route }: Props) {
  const { grade, goal } = route.params;
  return (
    <OnboardingScaffold
      step="第 3/4 步"
      title="孩子目前能力怎么样？"
      subtitle="我们会根据你的选择动态调整讲解深度和练习强度。"
      icon="stats-chart-outline"
    >
      <View style={styles.list}>
        {levels.map((item) => (
          <Pressable
            key={item.key}
            hitSlop={8}
            onPress={() =>
              navigation.navigate("OnboardingNickname", {
                grade,
                goal,
                level: item.key,
              })
            }
            style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
          >
            <Text style={styles.optionTitle}>{item.label}</Text>
            <Text style={styles.optionDesc}>{item.desc}</Text>
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
  optionCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
  optionCardPressed: {
    opacity: 0.88,
  },
  optionTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  optionDesc: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
});
