import { Ionicons } from "@expo/vector-icons";
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
import { submitGuardianConsentApi } from "../api/service";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { colors, radius, spacing } from "../design/tokens";
import { layoutStyles, textStyles } from "../design/theme";
import { RootStackParamList } from "../navigation/types";
import { useAppState } from "../state/AppState";
import { toUserErrorMessage } from "../utils/errorMessage";

type Relation = "father" | "mother" | "other_guardian";

type Props = NativeStackScreenProps<RootStackParamList, "GuardianConsent">;

const relationOptions: { key: Relation; label: string }[] = [
  { key: "mother", label: "母亲" },
  { key: "father", label: "父亲" },
  { key: "other_guardian", label: "其他监护人" },
];

export function GuardianConsentScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { parentId } = useAppState();
  const [relation, setRelation] = useState<Relation>("mother");
  const [childUnder14, setChildUnder14] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consentMutation = useMutation({
    mutationFn: submitGuardianConsentApi,
    onSuccess: () => {
      navigation.navigate("ChildProfile");
    },
    onError: (e) => {
      setError(toUserErrorMessage(e, "提交失败"));
    },
  });

  function onNext() {
    if (!parentId) {
      setError("请先完成家长登录");
      return;
    }
    setError(null);
    consentMutation.mutate({
        parentId,
        relation,
        childUnder14,
        agreed,
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
        <Text style={textStyles.h1}>监护人同意</Text>
        <Text style={textStyles.body}>未勾选同意前不可进入学习流程。</Text>

        <AppCard style={styles.card}>
          <Text style={textStyles.title}>监护人关系</Text>
          <View style={styles.rowWrap}>
            {relationOptions.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setRelation(item.key)}
                style={[styles.choice, relation === item.key && styles.choiceActive]}
              >
                <Text style={[textStyles.body, relation === item.key && styles.choiceTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.checkRow}
            onPress={() => setChildUnder14((prev) => !prev)}
          >
            <Ionicons
              name={childUnder14 ? "checkbox" : "square-outline"}
              size={22}
              color={colors.primary500}
            />
            <Text style={textStyles.body}>我确认孩子未满 14 周岁</Text>
          </Pressable>

          <Pressable style={styles.checkRow} onPress={() => setAgreed((prev) => !prev)}>
            <Ionicons
              name={agreed ? "checkbox" : "square-outline"}
              size={22}
              color={colors.primary500}
            />
            <Text style={textStyles.body}>
              我已阅读并同意《隐私政策》《儿童个人信息保护规则》
            </Text>
          </Pressable>

          <Text style={styles.link}>查看同意与撤回入口</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AppButton
            label={consentMutation.isPending ? "提交中..." : "同意并继续"}
            onPress={onNext}
            disabled={consentMutation.isPending || !agreed || !childUnder14}
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
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  link: {
    ...textStyles.caption,
    color: colors.primary500,
  },
  error: {
    ...textStyles.caption,
    color: colors.error,
  },
});
