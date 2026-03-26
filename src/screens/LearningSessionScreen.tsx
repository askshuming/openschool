import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useQueryClient } from "@tanstack/react-query";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { Animated, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trackEvent } from "../analytics/tracker";
import { ActivityCard } from "../api/contracts";
import { queryKeys } from "../api/queryKeys";
import { clearSessionCache, finishSessionApi } from "../api/service";
import { MascotState } from "../components/MascotBuddy";
import { ProgressHeader } from "../components/ProgressHeader";
import { LearningActionDock } from "../components/session/LearningActionDock";
import { LearningArrivalCard } from "../components/session/LearningArrivalCard";
import { LearningCompletionBridgeCard } from "../components/session/LearningCompletionBridgeCard";
import { LearningFlowCard } from "../components/session/LearningFlowCard";
import { LearningStepCard } from "../components/session/LearningStepCard";
import { ScreenErrorState } from "../components/states/ScreenErrorState";
import { ScreenLoadingState } from "../components/states/ScreenLoadingState";
import { ScreenOfflineState } from "../components/states/ScreenOfflineState";
import { useRecitationController } from "../hooks/useRecitationController";
import { motion, spacing } from "../design/tokens";
import { layoutStyles } from "../design/theme";
import { useCatalog } from "../hooks/useCatalog";
import { useLearningSession } from "../hooks/useLearningSession";
import { AppTabParamList } from "../navigation/types";
import { useAppState } from "../state/AppState";
import {
  getContentTypeLabel,
  getInputSourceLabel,
  useContentInputStore,
} from "../state/contentInputStore";
import { useLearningJourneyStore } from "../state/learningJourneyStore";
import { useSessionStore } from "../state/sessionStore";
import { triggerFeedback } from "../utils/feedback";
import { isOfflineError, toUserErrorMessage } from "../utils/errorMessage";
import { abortSpeechRecognition } from "../utils/speechRecognition";

type Props = BottomTabScreenProps<AppTabParamList, "Session">;
const GENERATED_DYNAMIC_LESSON_ID = "generated_dynamic";

const cardStrategyMap: Record<ActivityCard["type"], string> = {
  intro: "先让孩子快速进入内容，再开始当前路线",
  vocab: "先扫清生词和关键词，降低后续理解阻力",
  close_reading: "先把关键句读懂，后面的题才有抓手",
  main_idea: "先抓结构和中心意思，避免只看局部信息",
  quiz: "现在进入短练习，确认刚刚是否真的学会",
  feedback: "用错因回看前一步，把理解真正补齐",
  recitation: "通过朗读把内容再过一遍，帮助记忆固化",
  summary: "最后收束这次学习，并安排下一次巩固",
};

const gradeLabelMap: Record<string, string> = {
  G1: "一年级",
  G2: "二年级",
  G3: "三年级",
  G4: "四年级",
  G5: "五年级",
  G6: "六年级",
};

const readingLevelHintMap = {
  normal: "当前基础较稳定",
  struggling: "当前需要适度引导",
  very_struggling: "当前需要更多引导",
} as const;

const skillTagLabelMap: Record<ActivityCard["skillTag"], string> = {
  vocab: "字词理解",
  sentence_understanding: "句子理解",
  structure: "结构组织",
  main_idea: "主旨概括",
  evidence_locating: "证据定位",
  recitation: "朗读表达",
};

function getLearningCue(card: ActivityCard): {
  label: string;
  tip: string;
  mascotState: MascotState;
  speech: string;
} {
  switch (card.type) {
    case "intro":
      return {
        label: "先知道怎么学",
        tip: "先看一眼今天的目标，知道这节课只做什么。",
        mascotState: "teacher",
        speech: "先看目标，再开始",
      };
    case "vocab":
      return {
        label: "先看懂字词",
        tip: "把这几个词看懂，后面的内容会轻松很多。",
        mascotState: "teacher",
        speech: "先把词看懂",
      };
    case "close_reading":
      return {
        label: "先读重点句",
        tip: "先看原文，再看换种说法，只抓这一小段就够了。",
        mascotState: "teacher",
        speech: "先读这句重点",
      };
    case "main_idea":
      return {
        label: "先理清意思",
        tip: "顺着结构看一遍，把这页在讲什么理顺。",
        mascotState: "teacher",
        speech: "把意思理顺",
      };
    case "quiz":
      return {
        label: "现在做一题",
        tip: "只选一个现在最合适的答案，选完我就告诉你结果。",
        mascotState: "wow",
        speech: "选一个最合适的",
      };
    case "recitation":
      return {
        label: "现在开口跟读",
        tip: "先听一遍，再完整读一遍，系统会直接识别刚刚的朗读。",
        mascotState: "teacher",
        speech: "先听，再跟我读",
      };
    case "summary":
      return {
        label: "最后收一下尾",
        tip: "回想一下今天已经学会了什么，把这节课稳稳收住。",
        mascotState: "happy",
        speech: "今天学会了这些",
      };
    default:
      return {
        label: "继续这一小步",
        tip: "跟着当前提示完成这一小步就好。",
        mascotState: "teacher",
        speech: "跟我做这一小步",
      };
  }
}

export function LearningSessionScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const contentScrollRef = useRef<ScrollView>(null);
  const { childProfile, childId: activeChildId } = useAppState();
  const queryClient = useQueryClient();
  const childKey = activeChildId ?? childProfile?.nickname ?? "demo";
  const childId = activeChildId ?? (childProfile ? `child_${childProfile.nickname}` : "child_demo");
  const sessionLessonId = useSessionStore((s) => s.lessonId);
  const recentInputs = useContentInputStore((s) => s.recentInputs);
  const requestedLessonId = route.params?.lessonId ?? sessionLessonId ?? "g4_u1_l03";
  const contentInputId = route.params?.contentInputId;
  const recordSessionStarted = useLearningJourneyStore((s) => s.recordSessionStarted);
  const recordSessionCompleted = useLearningJourneyStore((s) => s.recordSessionCompleted);
  const [forceNewToken, setForceNewToken] = useState(0);
  const cardFadeAnim = useRef(new Animated.Value(1)).current;
  const sessionStartedTrackedRef = useRef<string | null>(null);
  const viewedCardKeySetRef = useRef<Set<string>>(new Set());
  const quizFeedbackKeyRef = useRef<string | null>(null);
  const recitationFeedbackKeyRef = useRef<string | null>(null);
  const step = useSessionStore((s) => s.step);
  const selectedOption = useSessionStore((s) => s.selectedOption);
  const answerResult = useSessionStore((s) => s.answerResult);
  const hydrateSession = useSessionStore((s) => s.hydrateSession);
  const setCurrentCardTitle = useSessionStore((s) => s.setCurrentCardTitle);
  const setStep = useSessionStore((s) => s.setStep);
  const setSelectedOption = useSessionStore((s) => s.setSelectedOption);
  const setAnswerResult = useSessionStore((s) => s.setAnswerResult);
  const clearSession = useSessionStore((s) => s.clearSession);
  const catalogQuery = useCatalog();

  const { sessionQuery, answerMutation, recitationMutation } = useLearningSession({
    childId,
    lessonId: requestedLessonId,
    forceNewToken,
    contentInputId,
  });
  const [showFlowDetails, setShowFlowDetails] = useState(false);

  useEffect(() => {
    if (route.params?.forceNew) {
      clearSession();
      clearSessionCache();
      queryClient.removeQueries({ queryKey: queryKeys.session(childId) });
      setForceNewToken((prev) => prev + 1);
      navigation.setParams({ forceNew: false });
    }
  }, [childId, clearSession, navigation, queryClient, route.params?.forceNew]);

  useEffect(() => {
    if (answerMutation.data) {
      setAnswerResult(answerMutation.data);
    }
  }, [answerMutation.data, setAnswerResult]);

  const cards = sessionQuery.data?.cards ?? [];
  const card = cards[step];
  const visibleStepIndices = cards.reduce<number[]>((accumulator, item, index) => {
    if (item.type !== "feedback") {
      accumulator.push(index);
    }
    return accumulator;
  }, []);
  const visibleTotalSteps = visibleStepIndices.length > 0 ? visibleStepIndices.length : cards.length;
  const currentVisibleStep =
    card?.type === "feedback"
      ? Math.max(1, visibleStepIndices.filter((index) => index < step).length + 1)
      : visibleStepIndices.indexOf(step) >= 0
        ? visibleStepIndices.indexOf(step) + 1
        : Math.min(step + 1, Math.max(1, visibleTotalSteps));
  const isQuiz = card?.type === "quiz";
  const isRecitation = card?.type === "recitation";
  const isLast = visibleTotalSteps > 0 && currentVisibleStep === visibleTotalSteps;
  const {
    recitationDone,
    recitationRecognizing,
    recitationTranscript,
    recitationFinalTranscript,
    recitationError,
    recitationVolume,
    recitationAssessment,
    recitationSupportText,
    showRecitationPreviewFallback,
    toggleRecitationCapture,
    completeRecitationForPreview,
    playRecitationSample,
    resetRecitation,
  } = useRecitationController({
    card,
    isSubmitting: recitationMutation.isPending,
    onSubmitRecitation,
  });

  useEffect(() => {
    setCurrentCardTitle(card?.payload.title ?? null);
  }, [card?.payload.title, setCurrentCardTitle]);

  useEffect(() => {
    cardFadeAnim.setValue(0);
    Animated.timing(cardFadeAnim, {
      toValue: 1,
      duration: motion.normal,
      useNativeDriver: true,
    }).start();
  }, [card?.id, cardFadeAnim]);

  useEffect(() => {
    setSelectedOption(null);
    setAnswerResult(null);
    answerMutation.reset();
    resetRecitation();
    recitationMutation.reset();
    recitationFeedbackKeyRef.current = null;
    quizFeedbackKeyRef.current = null;
  }, [card?.id]);

  useEffect(() => {
    setShowFlowDetails(false);
  }, [sessionQuery.data?.sessionId]);

  useEffect(() => {
    if (!card || card.type !== "feedback") {
      return;
    }
    const nextVisibleStep = cards.findIndex((item, index) => index > step && item.type !== "feedback");
    if (nextVisibleStep >= 0) {
      setStep(nextVisibleStep);
    }
  }, [card, cards, setStep, step]);

  useEffect(() => {
    if (!answerResult || !sessionQuery.data || !card || card.type !== "quiz") {
      return;
    }
    const feedbackKey = `${sessionQuery.data.sessionId}:${card.id}:${step}:${answerResult.correct ? "1" : "0"}`;
    if (quizFeedbackKeyRef.current === feedbackKey) {
      return;
    }
    quizFeedbackKeyRef.current = feedbackKey;
    triggerFeedback(answerResult.correct ? "success" : "error");
    setTimeout(() => {
      contentScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, [answerResult, card, sessionQuery.data, step]);

  useEffect(() => {
    if (!recitationDone || !sessionQuery.data || !card || card.type !== "recitation") {
      return;
    }
    const feedbackKey = `${sessionQuery.data.sessionId}:${card.id}:${step}`;
    if (recitationFeedbackKeyRef.current === feedbackKey) {
      return;
    }
    recitationFeedbackKeyRef.current = feedbackKey;
    triggerFeedback(recitationAssessment?.isCorrect ? "success" : "error");
    setTimeout(() => {
      contentScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, [card, recitationAssessment?.isCorrect, recitationDone, sessionQuery.data, step]);

  useEffect(() => {
    if (sessionQuery.data) {
      hydrateSession(
        sessionQuery.data.sessionId,
        sessionQuery.data.lessonId,
        sessionQuery.data.cards.length,
      );
    }
  }, [hydrateSession, sessionQuery.data]);

  useEffect(() => {
    if (!sessionQuery.data) {
      return;
    }
    if (sessionStartedTrackedRef.current === sessionQuery.data.sessionId) {
      return;
    }
    sessionStartedTrackedRef.current = sessionQuery.data.sessionId;
    trackEvent("session_started", {
      sessionId: sessionQuery.data.sessionId,
      lessonId: sessionQuery.data.lessonId,
      cardCount: sessionQuery.data.cards.length,
    });
  }, [sessionQuery.data]);

  useEffect(() => {
    if (!sessionQuery.data || !card) {
      return;
    }
    if (card.type === "feedback") {
      return;
    }
    const viewedKey = `${sessionQuery.data.sessionId}:${card.id}:${step}`;
    if (viewedCardKeySetRef.current.has(viewedKey)) {
      return;
    }
    viewedCardKeySetRef.current.add(viewedKey);
    trackEvent("card_viewed", {
      sessionId: sessionQuery.data.sessionId,
      lessonId: sessionQuery.data.lessonId,
      cardId: card.id,
      cardType: card.type,
      step: currentVisibleStep,
      totalSteps: visibleTotalSteps,
    });
  }, [card, currentVisibleStep, sessionQuery.data, step, visibleTotalSteps]);

  const activeLessonId = sessionQuery.data?.lessonId ?? requestedLessonId;
  const generationSource = route.params?.generationSource;
  const latestInput =
    (contentInputId ? recentInputs.find((item) => item.id === contentInputId) : null) ??
    recentInputs.find((item) => item.lessonId === activeLessonId) ??
    recentInputs[0] ??
    null;
  const isDynamicSession = activeLessonId === GENERATED_DYNAMIC_LESSON_ID;
  const lessonTitle =
    catalogQuery.data?.lessons.find((lesson) => lesson.id === activeLessonId)?.title ??
    latestInput?.matchedLessonTitle ??
    latestInput?.title ??
    "今日学习内容";
  const generationSourceLabel = latestInput
    ? `${getInputSourceLabel(latestInput.source)} · ${getContentTypeLabel(latestInput.contentType)}${
        isDynamicSession ? " · 路线适配" : ""
      }`
    : generationSource
      ? `${getInputSourceLabel(generationSource)} · 内容`
      : "当前路线";
  const childGradeLabel = childProfile?.grade ? gradeLabelMap[childProfile.grade] ?? childProfile.grade : "当前年级";
  const focusLabel = childProfile?.interests?.[0] ?? "阅读";
  const readingLevelHint = childProfile?.readingLevel
    ? readingLevelHintMap[childProfile.readingLevel]
    : "系统会自动调节";
  const currentStrategy = card ? cardStrategyMap[card.type] : "系统正在安排当前最适合的一步";
  const currentStepLabel = `第 ${currentVisibleStep} 步`;
  const learningCue = card ? getLearningCue(card) : null;
  const isFirstVisibleStep = currentVisibleStep === 1;

  useEffect(() => {
    if (!sessionQuery.data) {
      return;
    }
    recordSessionStarted({
      sessionId: sessionQuery.data.sessionId,
      lessonId: sessionQuery.data.lessonId,
      lessonTitle,
      contentInputId: latestInput?.id,
      contentTitle: latestInput?.title,
      source: latestInput?.source ?? generationSource,
      totalSteps: visibleTotalSteps,
    });
  }, [
    generationSource,
    latestInput?.id,
    latestInput?.source,
    latestInput?.title,
    lessonTitle,
    recordSessionStarted,
    sessionQuery.data,
    visibleTotalSteps,
  ]);

  async function onSubmitAnswer(currentCard: ActivityCard) {
    if (!sessionQuery.data || selectedOption == null || !currentCard.payload.questionId) {
      return;
    }
    trackEvent("answer_submitted", {
      sessionId: sessionQuery.data.sessionId,
      lessonId: sessionQuery.data.lessonId,
      questionId: currentCard.payload.questionId,
      selectedIndex: selectedOption,
    });
    await answerMutation.mutateAsync({
      sessionId: sessionQuery.data.sessionId,
      questionId: currentCard.payload.questionId,
      selectedIndex: selectedOption,
    });
  }

  async function onSubmitRecitation(currentCard: ActivityCard, transcript: string) {
    if (!sessionQuery.data || !currentCard.payload.segmentId) {
      return;
    }
    await recitationMutation.mutateAsync({
      childId,
      lessonId: sessionQuery.data.lessonId,
      segmentId: currentCard.payload.segmentId,
      durationSec: currentCard.payload.durationSec,
    });
  }

  function goToNextLearningStep() {
    const nextVisibleStep = cards.findIndex((item, index) => index > step && item.type !== "feedback");
    if (nextVisibleStep >= 0) {
      setStep(nextVisibleStep);
    }
  }

  function resetQuizAttempt() {
    setSelectedOption(null);
    setAnswerResult(null);
    answerMutation.reset();
    quizFeedbackKeyRef.current = null;
  }

  function resetRecitationAttempt() {
    recitationFeedbackKeyRef.current = null;
    recitationMutation.reset();
    resetRecitation();
  }

  function restartLesson() {
    Speech.stop();
    abortSpeechRecognition();
    clearSession();
    clearSessionCache();
    queryClient.removeQueries({ queryKey: queryKeys.session(childId) });
    setForceNewToken((prev) => prev + 1);
  }

  function pauseAndBackHome() {
    Speech.stop();
    abortSpeechRecognition();
    if (sessionQuery.data) {
      trackEvent("session_paused", {
        sessionId: sessionQuery.data.sessionId,
        lessonId: sessionQuery.data.lessonId,
        step: currentVisibleStep,
        totalSteps: visibleTotalSteps,
      });
    }
    navigation.navigate("Home");
  }

  async function completeLessonAndGoHome() {
    Speech.stop();
    abortSpeechRecognition();
    const completedAt = new Date().toISOString();
    if (sessionQuery.data?.sessionId) {
      try {
        await finishSessionApi({
          sessionId: sessionQuery.data.sessionId,
          completed: true,
        });
      } catch {
        // Keep local completion flow even when finish API fails.
      }
      recordSessionCompleted({
        sessionId: sessionQuery.data.sessionId,
        completedAt,
      });
    }
    clearSession();
    clearSessionCache();
    queryClient.removeQueries({ queryKey: queryKeys.session(childId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.progressSummary(childKey) });
    queryClient.invalidateQueries({ queryKey: queryKeys.weeklyReport(childKey) });
    queryClient.invalidateQueries({ queryKey: queryKeys.reviewQueue() });
    navigation.navigate("Home", {
      celebrationAt: completedAt,
      celebrationLessonTitle: lessonTitle,
    });
  }

  if (sessionQuery.isLoading) {
    return <ScreenLoadingState text="正在加载学习卡片..." />;
  }

  if (sessionQuery.isError) {
    if (isOfflineError(sessionQuery.error)) {
      return (
        <ScreenOfflineState
          title="学习页离线中"
          message="网络恢复后可继续加载学习卡片。"
          onRetry={() => {
            clearSession();
            clearSessionCache();
            sessionQuery.refetch();
          }}
        />
      );
    }
    return (
      <ScreenErrorState
        title="会话加载失败"
        message={toUserErrorMessage(sessionQuery.error, "请稍后重试")}
        onRetry={() => {
          clearSession();
          clearSessionCache();
          sessionQuery.refetch();
        }}
      />
    );
  }

  if (!card) {
    return (
      <ScreenErrorState
        title="会话加载失败"
        message="当前学习卡片不可用，请重新进入本课。"
        onRetry={() => {
          clearSession();
          clearSessionCache();
          sessionQuery.refetch();
        }}
      />
    );
  }

  const showQuizRetryActions = isQuiz && Boolean(answerResult && !answerResult.correct);
  const showRecitationRetryActions =
    isRecitation && Boolean(recitationDone && recitationAssessment && !recitationAssessment.isCorrect);
  const canGoNext = isQuiz
    ? Boolean(answerResult?.correct)
    : isRecitation
      ? Boolean(recitationDone && recitationAssessment?.isCorrect)
      : true;
  const actionDockStatusLabel = showQuizRetryActions
    ? "再试一次"
    : showRecitationRetryActions
      ? "再读一次"
      : isFirstVisibleStep
        ? "开始学"
      : isQuiz && answerResult?.correct
        ? "答对啦"
        : isRecitation && recitationDone && recitationAssessment?.isCorrect
          ? "读得不错"
          : isLast
            ? "最后一步"
            : `${currentVisibleStep}/${visibleTotalSteps}`;
  const actionDockTitle = showQuizRetryActions
    ? "这一步先别急，我陪你再做一遍"
    : showRecitationRetryActions
      ? "再读一遍，就会更顺"
      : isFirstVisibleStep
        ? isQuiz && !answerResult
          ? "先做眼前这一题"
          : isRecitation
            ? recitationRecognizing
              ? "我在听这一遍，马上给你结果"
              : recitationDone
                ? "这一遍已经完成，可以继续"
                : "先跟着读一遍"
            : "从这一步开始，我带着往下学"
      : isLast
        ? "这节已经学完，回首页就能接上复习"
        : isQuiz && !answerResult
          ? "先选一个答案，再点提交"
          : isQuiz && answerResult?.correct
            ? "这一步做对了，继续下一步"
          : isRecitation
            ? recitationRecognizing
              ? "读完这一遍，我用 Apple 语音识别帮你判断"
              : recitationDone
                ? "这次跟读已经完成，可以继续"
                : "先听示范，再开口读一遍"
            : "完成这一小步，我继续带你往下学";
  const actionDockMeta = showQuizRetryActions
    ? "看一下上面的鼓励提示，再选一次就行。"
    : showRecitationRetryActions
      ? "先听一遍示范，再完整读一遍。"
      : isFirstVisibleStep
        ? latestInput
          ? "不用自己判断内容类型。先把这一步做完，我继续带下一步。"
          : "先把这一步做完，我继续带下一步。"
      : isLast
        ? "回首页后会先收这页的 1 题温和复习；今天还想继续，就再拍下一页。"
        : isQuiz && answerResult?.correct
          ? "可以直接进入下一步。"
          : isRecitation
            ? recitationRecognizing
              ? "结束跟读后会自动给出识别结果。"
              : recitationDone
                ? "朗读结果已经收到，可以继续。"
                : "支持 Apple 语音识别。"
            : `当前正在学：${card.payload.title}`;

  return (
    <View style={layoutStyles.screen}>
      <ScrollView
        ref={contentScrollRef}
        style={layoutStyles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.sm + insets.top,
            paddingBottom: spacing.xxl + Math.max(insets.bottom, spacing.md) + 164,
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        scrollIndicatorInsets={{
          top: insets.top,
          bottom: Math.max(insets.bottom, spacing.md) + 132,
        }}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        alwaysBounceVertical
        keyboardShouldPersistTaps="handled"
      >
        <ProgressHeader
          lessonTitle={lessonTitle}
          currentStep={currentVisibleStep}
          totalSteps={visibleTotalSteps}
        />
        {latestInput && isFirstVisibleStep ? (
          <LearningArrivalCard latestInput={latestInput} childNickname={childProfile?.nickname} />
        ) : null}
        <LearningFlowCard
          showDetails={showFlowDetails}
          onToggle={() => setShowFlowDetails((prev) => !prev)}
          generationSourceLabel={generationSourceLabel}
          currentVisibleStep={currentVisibleStep}
          visibleTotalSteps={visibleTotalSteps}
          childNickname={childProfile?.nickname}
          latestInput={latestInput}
          currentCardTitle={card.payload.title}
          focusLabel={focusLabel}
          readingLevelHint={readingLevelHint}
          currentStrategy={currentStrategy}
        />

        <LearningStepCard
          card={card}
          currentStepLabel={currentStepLabel}
          skillTagLabel={skillTagLabelMap[card.skillTag]}
          learningCue={learningCue}
          fadeAnim={cardFadeAnim}
          selectedOption={selectedOption}
          answerResult={answerResult}
          onSelectOption={setSelectedOption}
          latestInputTitle={latestInput?.title}
          recitationRecognizing={recitationRecognizing}
          recitationSupportText={recitationSupportText}
          recitationTranscript={recitationTranscript}
          recitationFinalTranscript={recitationFinalTranscript}
          recitationDone={recitationDone}
          recitationAssessment={recitationAssessment}
          recitationErrorText={
            recitationMutation.isError
              ? recitationError ?? toUserErrorMessage(recitationMutation.error, "朗读记录失败，请重试。")
              : recitationError
          }
          recitationVolume={recitationVolume}
          showRecitationPreviewFallback={showRecitationPreviewFallback}
          onPlayRecitationSample={playRecitationSample}
          onToggleRecitationCapture={toggleRecitationCapture}
          onCompleteRecitationPreview={completeRecitationForPreview}
        />

        {isLast ? (
          <LearningCompletionBridgeCard
            lessonTitle={lessonTitle}
            routeLabel={latestInput?.routeLabel}
          />
        ) : null}
      </ScrollView>

      <LearningActionDock
        bottomInset={Math.max(insets.bottom, spacing.sm)}
        isLast={isLast}
        currentStepLabel={currentStepLabel}
        visibleTotalSteps={visibleTotalSteps}
        actionDockStatusLabel={actionDockStatusLabel}
        actionDockTitle={actionDockTitle}
        actionDockMeta={actionDockMeta}
        isQuiz={isQuiz}
        showQuizRetryActions={showQuizRetryActions}
        showRecitationRetryActions={showRecitationRetryActions}
        canGoNext={canGoNext}
        selectedOption={selectedOption}
        answerPending={answerMutation.isPending}
        onSubmitAnswer={() => onSubmitAnswer(card)}
        onRetryQuiz={resetQuizAttempt}
        onRetryRecitation={resetRecitationAttempt}
        onNext={goToNextLearningStep}
        onComplete={() => {
          void completeLessonAndGoHome();
        }}
        onPause={pauseAndBackHome}
        onRestart={restartLesson}
        showRestart={step > 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.pageHorizontal,
    gap: spacing.md,
  },
});
