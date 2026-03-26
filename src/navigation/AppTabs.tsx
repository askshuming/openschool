import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../design/tokens";
import { fontFamily } from "../design/theme";
import { useReviewQueue } from "../hooks/useReviewQueue";
import { HomeScreen } from "../screens/HomeScreen";
import { LearningSessionScreen } from "../screens/LearningSessionScreen";
import { ParentScreen } from "../screens/ParentScreen";
import { ReviewScreen } from "../screens/ReviewScreen";
import { useAppState } from "../state/AppState";
import { useSessionStore } from "../state/sessionStore";
import { AppTabParamList } from "./types";

const Tab = createBottomTabNavigator<AppTabParamList>();

const tabIconMap: Record<keyof AppTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: "camera-outline",
  Session: "book-outline",
  Review: "refresh-circle-outline",
  Parent: "person-circle-outline",
};

export function AppTabs() {
  const insets = useSafeAreaInsets();
  const { childProfile, childId } = useAppState();
  const sessionId = useSessionStore((s) => s.sessionId);
  const step = useSessionStore((s) => s.step);
  const totalSteps = useSessionStore((s) => s.totalSteps);
  const childKey = childId ?? childProfile?.nickname ?? "demo";
  const reviewQueueQuery = useReviewQueue(childKey, childId ?? undefined);
  const pendingReviewCount = (reviewQueueQuery.data?.items ?? []).filter(
    (item) => item.status === "pending",
  ).length;
  const reviewBadge = pendingReviewCount > 0 ? (pendingReviewCount > 99 ? "99+" : String(pendingReviewCount)) : undefined;
  const showSessionBadge = Boolean(sessionId) && step > 0 && step < totalSteps;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary500,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 56 + Math.max(insets.bottom, 8),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopColor: colors.borderSoft,
          backgroundColor: colors.bgElevated,
          borderTopWidth: Platform.OS === "ios" ? 0.5 : 1,
          shadowColor: colors.primary700,
          shadowOpacity: 0.04,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 10,
          elevation: 6,
        },
        tabBarLabelStyle: {
          fontFamily,
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarIcon: ({ color, size, focused }) =>
          focused ? (
            <LinearGradient
              colors={[colors.primary400, colors.primary600]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconActiveWrap}
            >
              <Ionicons name={tabIconMap[route.name]} color="#FFFFFF" size={size - 1} />
            </LinearGradient>
          ) : (
            <View style={styles.iconWrap}>
              <Ionicons name={tabIconMap[route.name]} color={color} size={size} />
            </View>
          ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "拍照" }} />
      <Tab.Screen
        name="Session"
        component={LearningSessionScreen}
        options={{
          title: "学习",
          tabBarBadge: showSessionBadge ? "•" : undefined,
          tabBarBadgeStyle: {
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colors.accent500,
            color: "#FFFFFF",
            fontSize: 12,
            fontWeight: "700",
          },
        }}
      />
      <Tab.Screen
        name="Review"
        component={ReviewScreen}
        options={{
          title: "复习",
          tabBarBadge: reviewBadge,
          tabBarBadgeStyle: {
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: colors.primary500,
            color: "#FFFFFF",
            fontSize: 11,
            fontWeight: "700",
          },
        }}
      />
      <Tab.Screen name="Parent" component={ParentScreen} options={{ title: "我的" }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  iconActiveWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
