import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { signupParentApi, submitGuardianConsentApi, upsertChildProfileApi } from "../api/service";
import { AppButton } from "../components/AppButton";
import { AppInput } from "../components/AppInput";
import { OnboardingScaffold } from "../components/OnboardingScaffold";
import { colors, spacing } from "../design/tokens";
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
      title="最后一步，怎么称呼孩子？"
      subtitle="昵称会用于首页问候与学习报告展示。"
      icon="happy-outline"
    >
      <AppInput
        label="孩子昵称"
        value={nickname}
        onChangeText={(text) => {
          setNickname(text);
          setError(null);
        }}
        placeholder="例如：小雨"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton
        label={finishMutation.isPending ? "创建中..." : "完成并进入首页"}
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
        你已选择：{grade} · {goalInterestMap[goal]} · 上传教材/练习题/图片后自动适配
      </Text>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  error: {
    ...textStyles.caption,
    color: colors.error,
  },
  meta: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
});
