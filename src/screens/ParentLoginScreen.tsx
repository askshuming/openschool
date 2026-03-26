import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signupParentApi } from "../api/service";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { AppInput } from "../components/AppInput";
import { colors, spacing } from "../design/tokens";
import { layoutStyles, textStyles } from "../design/theme";
import { RootStackParamList } from "../navigation/types";
import { useAppState } from "../state/AppState";
import { toUserErrorMessage } from "../utils/errorMessage";

type Props = NativeStackScreenProps<RootStackParamList, "ParentLogin">;

export function ParentLoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { setParentId } = useAppState();
  const [account, setAccount] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const signupMutation = useMutation({
    mutationFn: signupParentApi,
    onSuccess: (result) => {
      setParentId(result.parentId);
      navigation.navigate("GuardianConsent");
    },
    onError: (e) => {
      setError(toUserErrorMessage(e, "登录失败"));
    },
  });

  function onNext() {
    setError(null);
    signupMutation.mutate({ account, code });
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
        <Text style={textStyles.h1}>家长登录</Text>
        <Text style={textStyles.body}>先完成家长账户验证，再进入监护人同意流程。</Text>

        <AppCard style={styles.formCard}>
          <AppInput
            label="手机号或邮箱"
            value={account}
            onChangeText={setAccount}
            placeholder="请输入手机号或邮箱"
            keyboardType="email-address"
          />
          <AppInput
            label="验证码"
            value={code}
            onChangeText={setCode}
            placeholder="请输入 6 位验证码"
            keyboardType="number-pad"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton
            label={signupMutation.isPending ? "提交中..." : "下一步"}
            onPress={onNext}
            disabled={signupMutation.isPending || !account.trim() || !code.trim()}
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
  formCard: {
    gap: spacing.md,
  },
  error: {
    ...textStyles.caption,
    color: colors.error,
  },
});
