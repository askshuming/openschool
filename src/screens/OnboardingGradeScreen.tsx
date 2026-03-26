import { Ionicons } from "@expo/vector-icons";
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
      stepIndex={1}
      title="先选孩子的年级"
      subtitle="拍下来的内容会先按年级匹配难度，再安排更合适的语文学习路线。"
      icon="school-outline"
      mascotState="teacher"
      mascotSpeech="先把难度调对，后面拍一页就能直接开始。"
      highlights={["一年级到六年级", "后面都能再改"]}
      cardTitle="孩子现在在读"
      cardSubtitle="先选一个年级，系统会按这档标准安排起步难度。"
    >
      <View style={styles.grid}>
        {gradeOptions.map((item) => (
          <Pressable
            key={item.key}
            hitSlop={8}
            onPress={() => navigation.navigate("OnboardingGoal", { grade: item.key })}
            style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
          >
            <View style={styles.optionTop}>
              <View style={styles.optionBadge}>
                <Text style={styles.optionBadgeText}>{item.key.replace("G", "")} 年级</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary500} />
            </View>
            <Text style={styles.optionTitle}>{item.label}</Text>
            <Text style={styles.optionHint}>{item.hint}</Text>
            <Text style={styles.optionMeta}>拍照后先按这一档语文难度开始</Text>
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
    minHeight: 132,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.bgCard,
    padding: spacing.sm,
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  optionCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  optionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionBadge: {
    minHeight: 28,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary100,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  optionBadgeText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  optionTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  optionHint: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  optionMeta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
});
