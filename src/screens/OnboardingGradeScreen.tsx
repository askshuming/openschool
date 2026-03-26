import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { OnboardingScaffold } from "../components/OnboardingScaffold";
import { colors, radius, spacing } from "../design/tokens";
import { textStyles } from "../design/theme";
import { ChildProfileInput } from "../state/AppState";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingGrade">;

const gradeOptions: Array<{
  key: ChildProfileInput["grade"];
  label: string;
  hint: string;
}> = [
  { key: "G1", label: "一年级", hint: "识字与朗读启蒙" },
  { key: "G2", label: "二年级", hint: "句子理解与表达" },
  { key: "G3", label: "三年级", hint: "阅读理解起步" },
  { key: "G4", label: "四年级", hint: "段落与主旨训练" },
  { key: "G5", label: "五年级", hint: "篇章分析与归纳" },
  { key: "G6", label: "六年级", hint: "综合表达与冲刺" },
];

export function OnboardingGradeScreen({ navigation }: Props) {
  return (
    <OnboardingScaffold
      step="第 1/4 步"
      title="孩子当前年级是？"
      subtitle="选择后会自动匹配更合适的学习内容难度。"
      icon="school-outline"
    >
      <View style={styles.grid}>
        {gradeOptions.map((item) => (
          <Pressable
            key={item.key}
            hitSlop={8}
            onPress={() => navigation.navigate("OnboardingGoal", { grade: item.key })}
            style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
          >
            <Text style={styles.optionTitle}>{item.label}</Text>
            <Text style={styles.optionHint}>{item.hint}</Text>
          </Pressable>
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  optionCard: {
    width: "48%",
    minHeight: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.bgElevated,
    padding: spacing.sm,
    justifyContent: "space-between",
    gap: spacing.xxs,
  },
  optionCardPressed: {
    opacity: 0.88,
  },
  optionTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  optionHint: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
});
