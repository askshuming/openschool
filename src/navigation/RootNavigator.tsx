import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { colors, spacing } from "../design/tokens";
import { textStyles } from "../design/theme";
import { useAppState } from "../state/AppState";
import { OnboardingGoalScreen } from "../screens/OnboardingGoalScreen";
import { OnboardingGradeScreen } from "../screens/OnboardingGradeScreen";
import { OnboardingLevelScreen } from "../screens/OnboardingLevelScreen";
import { OnboardingNicknameScreen } from "../screens/OnboardingNicknameScreen";
import { AppTabs } from "./AppTabs";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { onboardingCompleted, isHydrated } = useAppState();

  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bgBase,
          gap: spacing.sm,
        }}
      >
        <Text style={textStyles.title}>正在恢复学习进度...</Text>
      </View>
    );
  }

  if (onboardingCompleted) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={AppTabs} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="OnboardingGrade">
      <Stack.Screen name="OnboardingGrade" component={OnboardingGradeScreen} />
      <Stack.Screen name="OnboardingGoal" component={OnboardingGoalScreen} />
      <Stack.Screen name="OnboardingLevel" component={OnboardingLevelScreen} />
      <Stack.Screen name="OnboardingNickname" component={OnboardingNicknameScreen} />
      <Stack.Screen name="MainTabs" component={AppTabs} />
    </Stack.Navigator>
  );
}
