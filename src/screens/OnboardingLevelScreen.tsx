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
  tone: string;
}> = [
  {
    key: "support_needed",
    label: "需要更多陪练",
    desc: "基础还不稳定，先从更简单的讲解和练习开始。",
    tone: "讲解更多 · 节奏更慢",
  },
  {
    key: "steady",
    label: "中等水平",
    desc: "大部分内容能完成，需要适度强化和巩固。",
    tone: "难度适中 · 强化基础",
  },
  {
    key: "advanced",
    label: "比较熟练",
    desc: "希望更有挑战，提升综合理解和表达能力。",
    tone: "挑战更高 · 练习更综合",
  },
];

export function OnboardingLevelScreen({ navigation, route }: Props) {
  const { grade, goal } = route.params;
  return (
    <OnboardingScaffold
      step="第 3/4 步"
      stepIndex={3}
      title="孩子目前大概在哪个状态"
      subtitle="不用选得特别精确，选最接近的一个就行。系统会按这个起点安排讲解深度和练习强度。"
      icon="stats-chart-outline"
      mascotState="encourage"
      mascotSpeech="选最接近的就行，后面会一边学一边继续调。"
      highlights={["只选最接近的一个", "讲解和练习强度会跟着调整"]}
      cardTitle="现在更像哪一种"
      cardSubtitle="这一步会决定首批学习任务更偏带着学，还是更偏独立完成。"
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
            <View style={styles.optionHead}>
              <Text style={styles.optionTitle}>{item.label}</Text>
              <View style={styles.tonePill}>
                <Text style={styles.toneText}>{item.tone}</Text>
              </View>
            </View>
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
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  optionCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  optionHead: {
    gap: spacing.xs,
  },
  optionTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  optionDesc: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  tonePill: {
    alignSelf: "flex-start",
    minHeight: 30,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    justifyContent: "center",
  },
  toneText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
});
