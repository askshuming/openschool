import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { signupParentApi, submitGuardianConsentApi, upsertChildProfileApi } from "../api/service";
import { AppButton } from "../components/AppButton";
import { AppInput } from "../components/AppInput";
import { OnboardingScaffold } from "../components/OnboardingScaffold";
import { colors, radius, spacing } from "../design/tokens";
import { textStyles } from "../design/theme";
import { OnboardingGoal, OnboardingLevel, RootStackParamList } from "../navigation/types";
import { ChildProfileInput, useAppState } from "../state/AppState";
import { toUserErrorMessage } from "../utils/errorMessage";

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingNickname">;

const goalInterestMap: Record<OnboardingGoal, string> = {
  reading: "阅读",
  writing: "写作",
  expression: "表达",
  comprehensive: "综合",
};

const levelReadingMap: Record<OnboardingLevel, ChildProfileInput["readingLevel"]> = {
  support_needed: "very_struggling",
  steady: "struggling",
  advanced: "normal",
};

const levelSummaryMap: Record<OnboardingLevel, string> = {
  support_needed: "需要更多陪练",
  steady: "中等水平",
  advanced: "比较熟练",
};

export function OnboardingNicknameScreen({ navigation, route }: Props) {
  const { completeOnboarding, setParentId } = useAppState();
  const { grade, goal, level } = route.params;
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);

  const finishMutation = useMutation({
    mutationFn: async () => {
      const account = `quick_${Date.now()}@onboard.app`;
      const signup = await signupParentApi({
        account,
        code: "000000",
      });
      await submitGuardianConsentApi({
        parentId: signup.parentId,
        relation: "mother",
        childUnder14: true,
        agreed: true,
      });
      const profile: ChildProfileInput = {
        nickname: nickname.trim(),
        grade,
        textbookVersion: "",
        interests: [goalInterestMap[goal]],
        readingLevel: levelReadingMap[level],
      };
      const child = await upsertChildProfileApi({
        parentId: signup.parentId,
        ...profile,
      });
      return {
        parentId: signup.parentId,
        childId: child.childId,
        profile,
      };
    },
    onSuccess: ({ parentId, childId, profile }) => {
      setParentId(parentId);
      completeOnboarding(profile, childId);
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    },
    onError: (e) => {
      setError(toUserErrorMessage(e, "创建档案失败，请稍后再试。"));
    },
  });

  return (
    <OnboardingScaffold
      step="第 4/4 步"
      stepIndex={4}
      title="最后一步，怎么称呼孩子"
      subtitle="设置好昵称后，首页就会按这个名字开始问候和安排学习。"
      icon="happy-outline"
      mascotState="happy"
      mascotSpeech="设置好昵称，我们就可以开始拍一页学习了。"
      highlights={["昵称会出现在首页和报告里", "这一步完成就能进入首页"]}
      cardTitle="输入孩子昵称"
      cardSubtitle="以后首页和学习报告都会这样称呼 Ta。"
    >
      <AppInput
        label="孩子昵称"
        value={nickname}
        onChangeText={(text) => {
          setNickname(text);
          setError(null);
        }}
        placeholder="例如：小雨"
        autoFocus
      />
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>已经为 Ta 选好了</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>{grade}</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>{goalInterestMap[goal]}</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>{levelSummaryMap[level]}</Text>
          </View>
        </View>
        <Text style={styles.summaryMeta}>进入首页后，上传教材、练习题或图片就会自动匹配合适路线。</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton
        label={finishMutation.isPending ? "正在准备首页..." : "进入首页，开始拍一页"}
        onPress={() => {
          if (!nickname.trim()) {
            setError("请先输入孩子昵称");
            return;
          }
          setError(null);
          finishMutation.mutate();
        }}
        disabled={finishMutation.isPending}
      />
      <Text style={styles.meta}>
        不需要先准备教材版本。拍下眼前这一页，系统会先识别内容，再安排对应学习路线。
      </Text>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  error: {
    ...textStyles.caption,
    color: colors.error,
  },
  summaryCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.primary50,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryTitle: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  summaryPill: {
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryPillText: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  summaryMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  meta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
});
