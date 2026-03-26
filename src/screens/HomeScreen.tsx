import { Ionicons } from "@expo/vector-icons";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MascotBuddy } from "../components/MascotBuddy";
import { HomeGenerationOverlay } from "../components/home/HomeGenerationOverlay";
import { ScreenErrorState } from "../components/states/ScreenErrorState";
import { ScreenLoadingState } from "../components/states/ScreenLoadingState";
import { ScreenOfflineState } from "../components/states/ScreenOfflineState";
import { colors, radius, spacing } from "../design/tokens";
import { layoutStyles, textStyles } from "../design/theme";
import { useCatalog } from "../hooks/useCatalog";
import { useHomeGenerationFlow } from "../hooks/useHomeGenerationFlow";
import { AppTabParamList } from "../navigation/types";
import { useAppState } from "../state/AppState";
import { useContentInputStore } from "../state/contentInputStore";
import { useLearningJourneyStore } from "../state/learningJourneyStore";
import { isOfflineError, toUserErrorMessage } from "../utils/errorMessage";

type Props = BottomTabScreenProps<AppTabParamList, "Home">;

const gradeLabelMap: Record<string, string> = {
  G1: "一年级",
  G2: "二年级",
  G3: "三年级",
  G4: "四年级",
  G5: "五年级",
  G6: "六年级",
};

function pickRecommendedLesson(
  lessons: Array<{ id: string; title: string }>,
  grade?: string,
) {
  if (lessons.length === 0) {
    return null;
  }
  if (!grade) {
    return lessons[0];
  }
  const prefix = grade.toLowerCase();
  return lessons.find((lesson) => lesson.id.toLowerCase().startsWith(`${prefix}_`)) ?? lessons[0];
}

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const { childProfile } = useAppState();
  const recentInputs = useContentInputStore((s) => s.recentInputs);
  const addInput = useContentInputStore((s) => s.addInput);
  const recordGeneratedInput = useLearningJourneyStore((s) => s.recordGeneratedInput);
  const catalogQuery = useCatalog();

  const lessons = catalogQuery.data?.lessons ?? [];
  const recommendedLesson = useMemo(
    () => pickRecommendedLesson(lessons, childProfile?.grade),
    [childProfile?.grade, lessons],
  );

  const childGradeLabel = childProfile?.grade ? gradeLabelMap[childProfile.grade] ?? childProfile.grade : "当前年级";
  const heroMinHeight = Math.max(560, Math.min(760, viewportHeight - insets.top - insets.bottom - 24));

  const { generationOverlayAnim, generatingSource, activeGeneratedInput, handleCameraStart } =
    useHomeGenerationFlow({
      launchLessonId: recommendedLesson?.id ?? null,
      recentInputCount: recentInputs.length,
      focusLabel: childProfile?.interests?.[0] ?? "阅读",
      gradeLabel: childGradeLabel,
      readingLevel: childProfile?.readingLevel,
      addInput,
      recordGeneratedInput,
      onNotice: (nextNotice) => {
        Alert.alert(nextNotice.title, nextNotice.body);
      },
      onNavigateToSession: ({ lessonId, generationSource, contentInputId }) => {
        navigation.navigate("Session", {
          forceNew: true,
          lessonId,
          generationSource,
          contentInputId,
        });
      },
    });

  if (catalogQuery.isLoading) {
    return <ScreenLoadingState text="正在加载首页..." />;
  }

  if (catalogQuery.isError) {
    if (isOfflineError(catalogQuery.error)) {
      return (
        <ScreenOfflineState
          title="首页离线中"
          message="网络恢复后可继续学习。"
          onRetry={() => {
            catalogQuery.refetch();
          }}
        />
      );
    }
    return (
      <ScreenErrorState
        title="首页加载失败"
        message={toUserErrorMessage(catalogQuery.error, "请稍后重试")}
        onRetry={() => {
          catalogQuery.refetch();
        }}
      />
    );
  }

  return (
    <View style={layoutStyles.screen}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          },
        ]}
      >
        <LinearGradient
          colors={[colors.primary100, "#F4FBF7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { minHeight: heroMinHeight }]}
        >
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.mascotWrap}>
            <MascotBuddy state="teacher" size={74} />
          </View>

          <View style={styles.heroMain}>
            <Text style={styles.heroLabel}>拍照学习</Text>

            <Pressable
              hitSlop={8}
              onPress={handleCameraStart}
              style={({ pressed }) => [styles.capturePrimaryAction, pressed && styles.heroActionPressed]}
            >
              <LinearGradient
                colors={[colors.primary500, colors.primary600]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.capturePrimaryCore}>
                <Ionicons name="camera" size={34} color={colors.primary600} />
              </View>
              <Text style={styles.capturePrimaryTitle}>拍一下</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      <HomeGenerationOverlay
        visible={Boolean(generatingSource)}
        animationValue={generationOverlayAnim}
        activeInput={activeGeneratedInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.pageHorizontal,
  },
  hero: {
    flex: 1,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgCard,
  },
  heroGlowOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: colors.primary200,
    top: -82,
    left: -66,
    opacity: 0.7,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 196,
    height: 196,
    borderRadius: 999,
    backgroundColor: colors.accent100,
    right: -72,
    bottom: -76,
    opacity: 0.42,
  },
  mascotWrap: {
    position: "absolute",
    top: 28,
    right: 4,
  },
  heroMain: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
  },
  heroLabel: {
    ...textStyles.title,
    color: colors.textPrimary,
    fontSize: 31,
    lineHeight: 37,
  },
  capturePrimaryAction: {
    width: "86%",
    maxWidth: 324,
    minHeight: 352,
    borderRadius: 42,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    shadowColor: colors.primary600,
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 28,
    elevation: 8,
  },
  capturePrimaryCore: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary700,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 2,
  },
  capturePrimaryTitle: {
    ...textStyles.h1,
    color: "#FFFFFF",
    fontSize: 42,
    lineHeight: 48,
  },
  heroActionPressed: {
    transform: [{ scale: 0.988 }],
    opacity: 0.94,
  },
});
