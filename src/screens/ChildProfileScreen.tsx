import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { upsertChildProfileApi } from "../api/service";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { AppInput } from "../components/AppInput";
import { colors, radius, spacing } from "../design/tokens";
import { layoutStyles, textStyles } from "../design/theme";
import { RootStackParamList } from "../navigation/types";
import { ChildProfileInput, useAppState } from "../state/AppState";
import { toUserErrorMessage } from "../utils/errorMessage";

type Props = NativeStackScreenProps<RootStackParamList, "ChildProfile">;

const grades: ChildProfileInput["grade"][] = ["G1", "G2", "G3", "G4", "G5", "G6"];
const readingLevels: { key: ChildProfileInput["readingLevel"]; label: string }[] = [
  { key: "normal", label: "正常" },
  { key: "struggling", label: "有点吃力" },
  { key: "very_struggling", label: "很吃力" },
];
const interestPool = ["动物", "体育", "太空", "生活", "历史"];

export function ChildProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { parentId, completeOnboarding } = useAppState();
  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState<ChildProfileInput["grade"]>("G4");
  const [textbookVersion] = useState("");
  const [readingLevel, setReadingLevel] =
    useState<ChildProfileInput["readingLevel"]>("normal");
  const [interests, setInterests] = useState<string[]>(["生活"]);
  const [error, setError] = useState<string | null>(null);

  const profileMutation = useMutation({
    mutationFn: upsertChildProfileApi,
    onSuccess: (result, variables) => {
      const profile: ChildProfileInput = {
        nickname: variables.nickname,
        grade: variables.grade,
        textbookVersion: variables.textbookVersion,
        readingLevel: variables.readingLevel,
        interests: variables.interests,
      };
      completeOnboarding(profile, result.childId);
      navigation.replace("MainTabs");
    },
    onError: (e) => {
      setError(toUserErrorMessage(e, "创建档案失败"));
    },
  });

  function toggleInterest(tag: string) {
    if (interests.includes(tag)) {
      setInterests((prev) => prev.filter((x) => x !== tag));
      return;
    }
    if (interests.length < 3) {
      setInterests((prev) => [...prev, tag]);
    }
  }

  function onFinish() {
    if (!parentId) {
      setError("请先完成家长登录与同意流程");
      return;
    }
    setError(null);
    profileMutation.mutate({
        parentId,
        nickname,
        grade,
        textbookVersion,
        readingLevel,
        interests,
      });
  }

  return (
    <KeyboardAvoidingView
      style={layoutStyles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={layoutStyles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.xl + insets.top,
            paddingBottom: spacing.xxl + Math.max(insets.bottom, spacing.md),
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        scrollIndicatorInsets={{
          top: insets.top,
          bottom: Math.max(insets.bottom, spacing.md),
        }}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        alwaysBounceVertical
        keyboardShouldPersistTaps="handled"
      >
        <Text style={textStyles.h1}>孩子档案</Text>
        <Text style={textStyles.body}>用于个性化讲解和练习数量调整。</Text>

        <AppCard style={styles.card}>
          <AppInput
            label="昵称"
            value={nickname}
            onChangeText={setNickname}
            placeholder="请输入孩子昵称"
          />

          <Text style={textStyles.meta}>年级</Text>
          <View style={styles.rowWrap}>
            {grades.map((item) => (
              <Pressable
                key={item}
                onPress={() => setGrade(item)}
                style={[styles.choice, grade === item && styles.choiceActive]}
              >
                <Text style={[textStyles.body, grade === item && styles.choiceTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={textStyles.meta}>兴趣标签（最多 3 个）</Text>
          <View style={styles.rowWrap}>
            {interestPool.map((item) => {
              const active = interests.includes(item);
              return (
                <Pressable
                  key={item}
                  onPress={() => toggleInterest(item)}
                  style={[styles.choice, active && styles.choiceActive]}
                >
                  <Text style={[textStyles.body, active && styles.choiceTextActive]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={textStyles.meta}>语文自评</Text>
          <View style={styles.rowWrap}>
            {readingLevels.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setReadingLevel(item.key)}
                style={[styles.choice, readingLevel === item.key && styles.choiceActive]}
              >
                <Text style={[textStyles.body, readingLevel === item.key && styles.choiceTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.metaLine}>教材、练习题或图片会在上传后自动识别</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton
            label={profileMutation.isPending ? "保存中..." : "完成创建，进入首页"}
            onPress={onFinish}
            disabled={profileMutation.isPending || !nickname.trim()}
          />
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.pageHorizontal,
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  choice: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgCard,
  },
  choiceActive: {
    backgroundColor: colors.primary100,
    borderColor: colors.primary500,
  },
  choiceTextActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  metaLine: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  error: {
    ...textStyles.caption,
    color: colors.error,
  },
});
