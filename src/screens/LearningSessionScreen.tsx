import { Ionicons } from "@expo/vector-icons";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useQueryClient } from "@tanstack/react-query";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trackEvent } from "../analytics/tracker";
import { ActivityCard } from "../api/contracts";
import { queryKeys } from "../api/queryKeys";
import { clearSessionCache, finishSessionApi } from "../api/service";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { FeedbackBox } from "../components/FeedbackBox";
import { MascotBuddy, MascotState } from "../components/MascotBuddy";
import { ProgressHeader } from "../components/ProgressHeader";
import { StatusChip } from "../components/StatusChip";
import { ScreenErrorState } from "../components/states/ScreenErrorState";
import { ScreenLoadingState } from "../components/states/ScreenLoadingState";
import { ScreenOfflineState } from "../components/states/ScreenOfflineState";
import { colors, motion, radius, shadow, size, spacing } from "../design/tokens";
import { layoutStyles, textStyles } from "../design/theme";
import { useCatalog } from "../hooks/useCatalog";
import { useLearningSession } from "../hooks/useLearningSession";
import { AppTabParamList } from "../navigation/types";
import { useAppState } from "../state/AppState";
import {
  getContentTypeLabel,
  getInputSourceLabel,
  getReadableFileSizeLabel,
  hasImagePreview,
  useContentInputStore,
} from "../state/contentInputStore";
import { useLearningJourneyStore } from "../state/learningJourneyStore";
import { useSessionStore } from "../state/sessionStore";
import { triggerFeedback } from "../utils/feedback";
import { isOfflineError, toUserErrorMessage } from "../utils/errorMessage";
import {
  abortSpeechRecognition,
  addSpeechRecognitionListener,
  isSpeechRecognitionAvailable,
  isSpeechRecognitionSupported,
  requestSpeechRecognitionPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
} from "../utils/speechRecognition";

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

interface RecitationAssessment {
  transcript: string;
  matchRatio: number;
  isCorrect: boolean;
  message: string;
  evidence: string;
}

function normalizeRecitationText(text: string) {
  return text.replace(/[，。！？；：、“”‘’《》〈〉（）()、,.!?;:\s]/g, "");
}

function lcsLength(source: string, target: string) {
  const rows = source.length + 1;
  const cols = target.length + 1;
  const dp = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (source[i - 1] === target[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[source.length][target.length];
}

function buildRecitationAssessment(expectedText: string, transcript: string): RecitationAssessment {
  const normalizedExpected = normalizeRecitationText(expectedText);
  const normalizedTranscript = normalizeRecitationText(transcript);
  const matched = normalizedExpected && normalizedTranscript
    ? lcsLength(normalizedExpected, normalizedTranscript) / normalizedExpected.length
    : 0;

  if (matched >= 0.82) {
    return {
      transcript,
      matchRatio: matched,
      isCorrect: true,
      message: "这段读得很稳，重点内容已经跟上了。",
      evidence: `识别到：${transcript}`,
    };
  }

  if (matched >= 0.58) {
    return {
      transcript,
      matchRatio: matched,
      isCorrect: false,
      message: "已经读对大部分内容了，再把停顿和个别词语读完整会更好。",
      evidence: `识别到：${transcript}`,
    };
  }

  return {
    transcript,
    matchRatio: matched,
    isCorrect: false,
    message: "已经勇敢开口了。先听一遍示范，再跟着读一遍会更稳。",
    evidence: `识别到：${transcript}`,
  };
}

function speechErrorMessage(errorMessage?: string) {
  if (!errorMessage) {
    return "语音识别暂时不可用，请再试一次。";
  }
  if (errorMessage.includes("not-allowed")) {
    return "没有拿到麦克风或语音识别权限，请先在系统设置里开启。";
  }
  return errorMessage;
}

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
  const [recitationDone, setRecitationDone] = useState(false);
  const [recitationRecognizing, setRecitationRecognizing] = useState(false);
  const [recitationTranscript, setRecitationTranscript] = useState("");
  const [recitationFinalTranscript, setRecitationFinalTranscript] = useState("");
  const [recitationError, setRecitationError] = useState<string | null>(null);
  const [recitationVolume, setRecitationVolume] = useState(0);
  const [pendingRecitationFinalize, setPendingRecitationFinalize] = useState(false);
  const [recitationAssessment, setRecitationAssessment] = useState<RecitationAssessment | null>(null);

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
    setRecitationDone(false);
    setRecitationRecognizing(false);
    setRecitationTranscript("");
    setRecitationFinalTranscript("");
    setRecitationError(null);
    setRecitationVolume(0);
    setPendingRecitationFinalize(false);
    setRecitationAssessment(null);
    Speech.stop();
    abortSpeechRecognition();
    recitationMutation.reset();
    recitationFeedbackKeyRef.current = null;
    quizFeedbackKeyRef.current = null;
  }, [answerMutation.reset, card?.id, recitationMutation.reset, setAnswerResult, setSelectedOption]);

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

  useEffect(
    () => () => {
      Speech.stop();
      abortSpeechRecognition();
    },
    [],
  );

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
    const startSubscription = addSpeechRecognitionListener("start", () => {
      setRecitationRecognizing(true);
      setRecitationError(null);
    });
    const endSubscription = addSpeechRecognitionListener("end", () => {
      setRecitationRecognizing(false);
    });
    const resultSubscription = addSpeechRecognitionListener("result", (event) => {
      const transcript = event.results?.[0]?.transcript?.trim() ?? "";
      if (!transcript) {
        return;
      }
      setRecitationTranscript(transcript);
      if (event.isFinal) {
        setRecitationFinalTranscript(transcript);
      }
    });
    const errorSubscription = addSpeechRecognitionListener("error", (event) => {
      setRecitationRecognizing(false);
      setPendingRecitationFinalize(false);
      setRecitationError(speechErrorMessage(event.message));
    });
    const volumeSubscription = addSpeechRecognitionListener("volumechange", (event) => {
      setRecitationVolume(Math.max(0, Math.min(1, (event.value + 2) / 12)));
    });

    return () => {
      startSubscription?.remove();
      endSubscription?.remove();
      resultSubscription?.remove();
      errorSubscription?.remove();
      volumeSubscription?.remove();
    };
  }, []);

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
  const recitationSupportText = isSpeechRecognitionSupported()
    ? isSpeechRecognitionAvailable()
      ? "原生语音识别已就绪"
      : "当前设备暂时不可用语音识别"
    : "当前预览环境不支持原生语音识别";

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

  useEffect(() => {
    if (!pendingRecitationFinalize || recitationRecognizing || !card || card.type !== "recitation") {
      return;
    }

    const timer = setTimeout(() => {
      const transcript = (recitationFinalTranscript || recitationTranscript).trim();
      setPendingRecitationFinalize(false);

      if (!transcript) {
        setRecitationError("没有识别到朗读内容，再试一次。");
        return;
      }

      void completeRecitationAttempt(card, transcript);
    }, 320);

    return () => clearTimeout(timer);
  }, [
    card,
    pendingRecitationFinalize,
    recitationFinalTranscript,
    recitationRecognizing,
    recitationTranscript,
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
    const assessment = buildRecitationAssessment(currentCard.payload.recitationText ?? "", transcript);
    setRecitationAssessment(assessment);
    setRecitationDone(true);
  }

  async function completeRecitationAttempt(currentCard: ActivityCard, transcript: string) {
    setRecitationError(null);
    try {
      await onSubmitRecitation(currentCard, transcript);
    } catch (error) {
      setRecitationError(toUserErrorMessage(error, "朗读记录失败，请重试。"));
    }
  }

  async function startRecitationCapture(currentCard: ActivityCard) {
    if (!currentCard.payload.recitationText) {
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setRecitationError("当前预览环境不支持原生语音识别。请使用 iOS 开发版或真机预览。");
      return;
    }

    if (!isSpeechRecognitionAvailable()) {
      setRecitationError("当前设备暂时不能使用语音识别，请检查 Siri 与听写是否已开启。");
      return;
    }

    const permission = await requestSpeechRecognitionPermissions();
    if (!permission.granted) {
      setRecitationError("没有拿到麦克风和语音识别权限，请先在系统设置里开启。");
      return;
    }

    Speech.stop();
    setRecitationDone(false);
    setRecitationError(null);
    setRecitationTranscript("");
    setRecitationFinalTranscript("");
    setRecitationAssessment(null);
    setPendingRecitationFinalize(false);
    setRecitationVolume(0);

    const started = startSpeechRecognition({
      lang: "zh-CN",
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      addsPunctuation: true,
      requiresOnDeviceRecognition: Platform.OS === "ios",
      contextualStrings: [
        currentCard.payload.recitationText,
        ...currentCard.payload.recitationText.split(/[，。！？；：、]/).filter(Boolean),
      ],
    });
    if (!started) {
      setRecitationError("当前环境还没有接入原生语音识别，请切换到 iOS 开发版再试。");
    }
  }

  function stopRecitationCapture() {
    if (!recitationRecognizing) {
      return;
    }
    setPendingRecitationFinalize(true);
    stopSpeechRecognition();
  }

  function toggleRecitationCapture(currentCard: ActivityCard) {
    if (recitationMutation.isPending) {
      return;
    }
    if (recitationRecognizing) {
      stopRecitationCapture();
      return;
    }
    void startRecitationCapture(currentCard);
  }

  function completeRecitationForPreview(currentCard: ActivityCard) {
    if (recitationMutation.isPending) {
      return;
    }
    void completeRecitationAttempt(currentCard, currentCard.payload.recitationText ?? "");
  }

  function playRecitationSample(currentCard: ActivityCard) {
    if (!currentCard.payload.recitationText) {
      return;
    }
    stopSpeechRecognition();
    setRecitationRecognizing(false);
    setPendingRecitationFinalize(false);
    Speech.stop();
    Speech.speak(currentCard.payload.recitationText, {
      language: "zh-CN",
      rate: 0.92,
      pitch: 1,
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
    Speech.stop();
    abortSpeechRecognition();
    recitationFeedbackKeyRef.current = null;
    recitationMutation.reset();
    setRecitationDone(false);
    setRecitationRecognizing(false);
    setRecitationTranscript("");
    setRecitationFinalTranscript("");
    setRecitationError(null);
    setRecitationVolume(0);
    setPendingRecitationFinalize(false);
    setRecitationAssessment(null);
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

  function renderCardBody(currentCard: ActivityCard) {
    if (currentCard.type === "intro") {
      return (
        <View style={styles.blockGap}>
          {currentCard.payload.goals?.map((goal) => (
            <Text key={goal} style={styles.contentText}>
              {`• ${goal}`}
            </Text>
          ))}
        </View>
      );
    }
    if (currentCard.type === "vocab") {
      return (
        <View style={styles.blockGap}>
          {currentCard.payload.vocabItems?.map((item) => (
            <View key={item.word} style={styles.vocabItem}>
              <Text style={textStyles.title}>
                {item.word} <Text style={styles.pinyin}>{item.pinyin}</Text>
              </Text>
              <Text style={styles.contentText}>{item.explanation}</Text>
              <Text style={styles.subText}>{item.example}</Text>
            </View>
          ))}
        </View>
      );
    }
    if (currentCard.type === "close_reading") {
      return (
        <View style={styles.blockGap}>
          <Text style={styles.subLabel}>原文</Text>
          <Text style={styles.contentText}>{currentCard.payload.paragraph}</Text>
          <Text style={styles.subLabel}>换种说法</Text>
          <Text style={styles.contentText}>{currentCard.payload.simpleExplanation}</Text>
        </View>
      );
    }
    if (currentCard.type === "main_idea") {
      return (
        <View style={styles.blockGap}>
          {currentCard.payload.structure?.map((node) => (
            <Text key={node} style={styles.contentText}>
              {`• ${node}`}
            </Text>
          ))}
          <Text style={styles.subLabel}>主旨</Text>
          <Text style={styles.contentText}>{currentCard.payload.mainIdea}</Text>
        </View>
      );
    }
    if (currentCard.type === "quiz") {
      return (
        <View style={styles.optionWrap}>
          <Text style={styles.contentText}>{currentCard.payload.body}</Text>
          {currentCard.payload.options?.map((option, idx) => {
            const active = selectedOption === idx;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  if (!answerResult) {
                    setSelectedOption(idx);
                  }
                }}
                style={[styles.option, active && styles.optionActive]}
              >
                <Text style={[textStyles.body, active && styles.optionTextActive]}>{option}</Text>
              </Pressable>
            );
          })}
          {answerResult ? (
            <FeedbackBox
              isCorrect={Boolean(answerResult.correct)}
              message={
                answerResult.correct
                  ? answerResult.feedback.whyWrong
                  : `${answerResult.feedback.whyWrong} ${answerResult.feedback.retryQuestion}`
              }
              evidence={answerResult.feedback.evidenceText}
            />
          ) : null}
        </View>
      );
    }
    if (currentCard.type === "feedback") {
      return (
        <View style={styles.blockGap}>
          {answerResult ? (
            <FeedbackBox
              isCorrect={Boolean(answerResult.correct)}
              message={answerResult.feedback.whyWrong}
              evidence={answerResult.feedback.evidenceText}
            />
          ) : (
            <Text style={styles.contentText}>先完成小测后再查看反馈。</Text>
          )}
        </View>
      );
    }
    if (currentCard.type === "recitation") {
      return (
        <View style={styles.blockGap}>
          <Text style={styles.subLabel}>跟读片段</Text>
          <View style={styles.recitationQuoteWrap}>
            <Text style={styles.recitationQuote}>{currentCard.payload.recitationText}</Text>
          </View>
          <Text style={styles.contentText}>
            {currentCard.payload.recitationTip ?? "先听示范，再完整朗读一遍。"}
          </Text>
          <View style={styles.recitationActionRow}>
            <Pressable
              hitSlop={8}
              onPress={() => playRecitationSample(currentCard)}
              style={({ pressed }) => [
                styles.recitationSecondaryAction,
                pressed && styles.recitationActionPressed,
              ]}
            >
              <Ionicons name="volume-high-outline" size={18} color={colors.primary500} />
              <Text style={styles.recitationSecondaryText}>听示范</Text>
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() => toggleRecitationCapture(currentCard)}
              style={({ pressed }) => [
                styles.recitationPrimaryAction,
                recitationRecognizing && styles.recitationPrimaryActionActive,
                pressed && styles.recitationActionPressed,
              ]}
            >
              <Ionicons
                name={recitationRecognizing ? "stop-circle-outline" : "mic-outline"}
                size={20}
                color={recitationRecognizing ? "#FFFFFF" : colors.primary600}
              />
              <Text
                style={[
                  styles.recitationPrimaryText,
                  recitationRecognizing && styles.recitationPrimaryTextActive,
                ]}
              >
                {recitationRecognizing ? "结束跟读" : "开始跟读"}
              </Text>
            </Pressable>
          </View>
          {!isSpeechRecognitionSupported() || !isSpeechRecognitionAvailable() ? (
            <Pressable
              hitSlop={8}
              onPress={() => completeRecitationForPreview(currentCard)}
              style={({ pressed }) => [
                styles.recitationPreviewFallback,
                pressed && styles.recitationActionPressed,
              ]}
            >
              <Ionicons name="construct-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.recitationPreviewFallbackText}>当前预览环境先标记完成</Text>
            </Pressable>
          ) : null}
          <View style={styles.recitationStatusCard}>
            <View style={styles.recitationStatusRow}>
              <StatusChip label={recitationSupportText} tone="primary" />
              {recitationRecognizing ? (
                <StatusChip label="识别中" tone="accent" />
              ) : recitationAssessment ? (
                <StatusChip label={`${Math.round(recitationAssessment.matchRatio * 100)}% 匹配`} tone="accent" />
              ) : null}
            </View>
            <View style={styles.recitationMeterTrack}>
              <View
                style={[
                  styles.recitationMeterFill,
                  {
                    width: `${Math.max(12, recitationRecognizing ? recitationVolume * 100 : recitationAssessment ? recitationAssessment.matchRatio * 100 : 12)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.recitationTranscriptLabel}>
              {recitationRecognizing ? "实时识别" : recitationAssessment ? "本次识别结果" : "准备跟读"}
            </Text>
            <Text style={styles.recitationTranscriptText}>
              {recitationFinalTranscript ||
                recitationTranscript ||
                recitationAssessment?.transcript ||
                "点“开始跟读”后，系统会直接识别孩子刚刚读出的内容。"}
            </Text>
          </View>
          {recitationMutation.isError || recitationError ? (
            <Text style={styles.errorHint}>
              {recitationError ?? toUserErrorMessage(recitationMutation.error, "朗读记录失败，请重试。")}
            </Text>
          ) : null}
          {recitationDone && recitationAssessment ? (
            <FeedbackBox
              isCorrect={recitationAssessment.isCorrect}
              message={recitationAssessment.message}
              evidence={recitationAssessment.evidence}
            />
          ) : null}
        </View>
      );
    }

    return (
      <View style={styles.blockGap}>
        <View style={styles.summaryHeroCard}>
          <MascotBuddy state="happy" size={92} speech="今天这节学完啦" />
          <View style={styles.summaryHeroCopy}>
            <Text style={styles.summaryHeroTitle}>这次已经掌握</Text>
            <Text style={styles.summaryHeroText}>
              {latestInput
                ? `基于「${latestInput.title}」拆出的任务已经完成，今天先把这些重点收好。`
                : "这节课的关键内容已经走完，可以先稳稳收住。"}
            </Text>
          </View>
        </View>

        <View style={styles.summaryTagWrap}>
          {currentCard.payload.mastered?.map((item) => (
            <View key={item} style={styles.summaryTag}>
              <Text style={styles.summaryTagText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryNextCard}>
          <Text style={styles.summaryNextLabel}>下一步</Text>
          <Text style={styles.summaryNextText}>{currentCard.payload.nextReview}</Text>
          <Text style={styles.summaryNextMeta}>完成后会回到首页主线，系统会继续把这次学习接到温和复习。</Text>
        </View>
      </View>
    );
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
  const actionDockStatusLabel = isLast ? "最后一步" : `${currentVisibleStep}/${visibleTotalSteps}`;
  const actionDockTitle = showQuizRetryActions
    ? "做错没关系，再试一次会更稳"
    : showRecitationRetryActions
      ? "再读一遍就更顺了"
      : isLast
        ? "收好这节学习，系统会自动接上下一步"
        : isQuiz && !answerResult
          ? "选好一个答案就提交"
          : isRecitation
            ? recitationDone
              ? "这次朗读已经完成，可以继续"
              : "先听示范，再开口读一遍"
            : "完成这一小步，我会继续带着往下学";
  const actionDockMeta = showQuizRetryActions || showRecitationRetryActions
    ? card.payload.title
    : isLast
      ? "结束后会回到首页主线，明天还能从这里续上。"
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
        <AppCard style={styles.flowCard}>
          <Pressable
            hitSlop={8}
            onPress={() => setShowFlowDetails((prev) => !prev)}
            style={({ pressed }) => [
              showFlowDetails ? styles.flowSummaryExpanded : styles.flowSummaryCollapsed,
              pressed && styles.flowSummaryPressed,
            ]}
          >
            {showFlowDetails ? (
              <>
                <View style={styles.flowSummaryCopy}>
                  <View style={styles.flowChipRow}>
                    <StatusChip label={generationSourceLabel} tone="primary" />
                    <StatusChip label={`${currentVisibleStep}/${visibleTotalSteps}`} tone="accent" />
                  </View>
                  <Text style={styles.flowTitle}>
                    {childProfile?.nickname
                      ? `${childProfile.nickname} 的${latestInput?.routeLabel ?? "当前学习路线"}已收好`
                      : latestInput?.routeLabel
                        ? `${latestInput.routeLabel}已收好`
                        : "当前学习路线已收好"}
                  </Text>
                  <Text style={styles.flowText}>
                    {latestInput
                      ? `基于「${latestInput.title}」已安排，先做「${latestInput.recommendedEntryStep}」，当前直接学「${card.payload.title}」。`
                      : `当前直接学「${card.payload.title}」，其他路线说明已收起。`}
                  </Text>
                </View>
                <View style={styles.flowToggle}>
                  <Text style={styles.flowToggleText}>收起</Text>
                  <Ionicons
                    name="chevron-up-outline"
                    size={18}
                    color={colors.primary500}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.flowCollapsedCopy}>
                  <StatusChip label={`${currentVisibleStep}/${visibleTotalSteps}`} tone="accent" />
                  <Text style={styles.flowCollapsedText} numberOfLines={1}>
                    {childProfile?.nickname
                      ? `已为${childProfile.nickname}排好${latestInput?.routeLabel ?? "当前学习路线"}`
                      : latestInput?.routeLabel
                        ? `已排好${latestInput.routeLabel}`
                        : "当前学习路线已收好"}
                  </Text>
                </View>
                <View style={styles.flowToggleInline}>
                  <Text style={styles.flowToggleText}>展开</Text>
                  <Ionicons
                    name="chevron-down-outline"
                    size={18}
                    color={colors.primary500}
                  />
                </View>
              </>
            )}
          </Pressable>

          {showFlowDetails ? (
            <View style={styles.flowDetails}>
              {latestInput ? (
                <View style={styles.generatedSourceCard}>
                  <View style={styles.generatedSourcePreviewWrap}>
                    <Text style={styles.generatedSourceLabel}>本次输入</Text>
                    {hasImagePreview(latestInput) ? (
                      <Image
                        source={{ uri: latestInput.previewUri ?? undefined }}
                        style={styles.generatedSourcePreview}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.generatedSourcePreviewFallback}>
                        <Text style={styles.generatedSourcePreviewText}>
                          {getContentTypeLabel(latestInput.contentType)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.generatedSourceContent}>
                    <Text style={styles.generatedSourceTitle} numberOfLines={1}>
                      {latestInput.title}
                    </Text>
                    {latestInput.fileName ? (
                      <Text style={styles.generatedSourceMeta} numberOfLines={1}>
                        {latestInput.fileName}
                        {latestInput.fileSize ? ` · ${getReadableFileSizeLabel(latestInput.fileSize)}` : ""}
                      </Text>
                    ) : null}
                    {latestInput.recognizedTextSnippet ? (
                      <Text style={styles.generatedSourceSnippet} numberOfLines={2}>
                        识别到：{latestInput.recognizedTextSnippet}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
              <View style={styles.flowReasonCard}>
                <Text style={styles.flowReasonLabel}>为什么先学这一步</Text>
                <Text style={styles.flowReasonText}>
                  {latestInput
                    ? `${latestInput.routeLabel} · ${latestInput.primaryChallenge} · ${latestInput.recommendedEntryStep} · ${currentStrategy}`
                    : `${focusLabel}优先 · ${readingLevelHint} · ${currentStrategy}`}
                </Text>
              </View>
            </View>
          ) : null}
        </AppCard>

        <Animated.View
          style={[
            styles.cardMotion,
            {
              opacity: cardFadeAnim,
              transform: [
                {
                  translateY: cardFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <AppCard style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <StatusChip label={currentStepLabel} tone="accent" />
              <StatusChip label={skillTagLabelMap[card.skillTag]} tone="primary" />
            </View>
            {learningCue ? (
              <View style={styles.learningCueCard}>
                <MascotBuddy
                  state={learningCue.mascotState}
                  size={74}
                  speech={learningCue.speech}
                  style={styles.learningCueMascot}
                />
                <View style={styles.learningCueCopy}>
                  <Text style={styles.learningCueLabel}>{learningCue.label}</Text>
                  <Text style={styles.learningCueText}>{learningCue.tip}</Text>
                </View>
              </View>
            ) : null}
            <Text style={textStyles.title}>{card.payload.title}</Text>
            {renderCardBody(card)}
          </AppCard>
        </Animated.View>

        {isLast ? (
          <AppCard style={styles.completionBridgeCard}>
            <View style={styles.rowTop}>
              <Text style={styles.completionBridgeTitle}>完成后系统会自动接上下一步</Text>
              <StatusChip label="自动续上" tone="primary" />
            </View>
            <Text style={styles.completionBridgeText}>
              这节学习结束后，首页主线会切到这次内容，方便明天继续看进度或直接进入温和复习。
            </Text>
          </AppCard>
        ) : null}
      </ScrollView>

      <View style={[styles.actionDock, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <View style={styles.actionDockSurface}>
          <View style={styles.actionDockHeader}>
            <View style={styles.actionDockCopy}>
              <Text style={styles.actionDockEyebrow}>
                {isLast ? "最后一步" : `${currentStepLabel} · 共 ${visibleTotalSteps} 步`}
              </Text>
              <Text style={styles.actionDockTitle}>{actionDockTitle}</Text>
              <Text style={styles.actionDockMeta} numberOfLines={1}>
                {actionDockMeta}
              </Text>
            </View>
            <StatusChip label={actionDockStatusLabel} tone="accent" />
          </View>

          {isQuiz && !answerResult ? (
            <AppButton
              label={answerMutation.isPending ? "提交中..." : "提交答案"}
              onPress={() => onSubmitAnswer(card)}
              disabled={selectedOption == null || answerMutation.isPending}
            />
          ) : null}

          {showQuizRetryActions ? (
            <View style={styles.inlineActionRow}>
              <View style={styles.inlineActionCell}>
                <AppButton label="再试一次" onPress={resetQuizAttempt} />
              </View>
              <View style={styles.inlineActionCell}>
                <AppButton label="先继续" onPress={goToNextLearningStep} variant="secondary" />
              </View>
            </View>
          ) : null}

          {showRecitationRetryActions ? (
            <View style={styles.inlineActionRow}>
              <View style={styles.inlineActionCell}>
                <AppButton label="再读一次" onPress={resetRecitationAttempt} />
              </View>
              <View style={styles.inlineActionCell}>
                <AppButton label="先继续" onPress={goToNextLearningStep} variant="secondary" />
              </View>
            </View>
          ) : null}

          {canGoNext && !isLast ? (
            <AppButton label="下一步" onPress={goToNextLearningStep} />
          ) : null}

          {isLast ? (
            <AppButton
              label="完成学习，返回首页"
              onPress={async () => {
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
              }}
            />
          ) : null}

          <View style={[styles.restartRow, step === 0 && styles.restartRowSingleAction]}>
            <Pressable hitSlop={8} onPress={pauseAndBackHome}>
              <Text style={styles.pauseText}>稍后继续</Text>
            </Pressable>
            {step > 0 ? (
              <Pressable hitSlop={8} onPress={restartLesson}>
                <Text style={styles.restartText}>重新开始本课</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.pageHorizontal,
    gap: spacing.md,
  },
  flowCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  flowSummaryExpanded: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  flowSummaryCollapsed: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  flowSummaryPressed: {
    opacity: 0.92,
  },
  flowSummaryCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  flowChipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  flowTitle: {
    ...textStyles.title,
    fontSize: 18,
    lineHeight: 24,
  },
  flowText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  flowToggle: {
    alignItems: "center",
    gap: 2,
  },
  flowToggleInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  flowToggleText: {
    ...textStyles.meta,
    color: colors.primary500,
  },
  flowCollapsedCopy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  flowCollapsedText: {
    ...textStyles.meta,
    color: colors.textSecondary,
    flex: 1,
  },
  flowDetails: {
    gap: spacing.sm,
  },
  generatedSourceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.sm,
  },
  generatedSourcePreviewWrap: {
    gap: spacing.xxs,
  },
  generatedSourceLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  generatedSourcePreview: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.primary100,
  },
  generatedSourcePreviewFallback: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.primary100,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  generatedSourcePreviewText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  generatedSourceContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  generatedSourceTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  generatedSourceMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  generatedSourceSnippet: {
    ...textStyles.caption,
    color: colors.primary600,
  },
  flowReasonCard: {
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  flowReasonLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  flowReasonText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  summaryHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
    padding: spacing.sm,
  },
  summaryHeroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryHeroTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  summaryHeroText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  summaryTagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  summaryTag: {
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  summaryTagText: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  summaryNextCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent300,
    backgroundColor: colors.accent100,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  summaryNextLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  summaryNextText: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  summaryNextMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  recitationQuoteWrap: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.primary100,
  },
  recitationQuote: {
    ...textStyles.body,
    color: colors.textPrimary,
  },
  recitationActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  recitationSecondaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
    paddingHorizontal: spacing.md,
  },
  recitationSecondaryText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  recitationPrimaryAction: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary300,
    backgroundColor: colors.primary100,
    paddingHorizontal: spacing.md,
  },
  recitationPrimaryActionActive: {
    backgroundColor: colors.primary500,
    borderColor: colors.primary500,
  },
  recitationPrimaryText: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  recitationPrimaryTextActive: {
    color: "#FFFFFF",
  },
  recitationActionPressed: {
    transform: [{ scale: 0.985 }],
  },
  recitationPreviewFallback: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.md,
  },
  recitationPreviewFallbackText: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  recitationStatusCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgElevated,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  recitationStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  recitationMeterTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.primary100,
    overflow: "hidden",
  },
  recitationMeterFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary500,
  },
  recitationTranscriptLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  recitationTranscriptText: {
    ...textStyles.body,
    color: colors.textSecondary,
    lineHeight: 23,
  },
  card: {
    gap: spacing.md,
  },
  learningCueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  learningCueMascot: {
    marginLeft: -6,
  },
  learningCueCopy: {
    flex: 1,
    gap: 2,
  },
  learningCueLabel: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  learningCueText: {
    ...textStyles.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  cardMotion: {
    width: "100%",
  },
  actionDock: {
    position: "absolute",
    left: spacing.pageHorizontal,
    right: spacing.pageHorizontal,
    bottom: 0,
  },
  actionDockSurface: {
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: "rgba(255,255,255,0.96)",
    padding: spacing.sm,
    ...shadow.card,
  },
  actionDockHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  actionDockCopy: {
    flex: 1,
    gap: 2,
  },
  actionDockEyebrow: {
    ...textStyles.meta,
    color: colors.primary600,
  },
  actionDockTitle: {
    ...textStyles.title,
    color: colors.textPrimary,
  },
  actionDockMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  restartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    minHeight: size.touchTargetMin,
  },
  restartRowSingleAction: {
    justifyContent: "flex-end",
  },
  pauseText: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  restartText: {
    ...textStyles.meta,
    color: colors.primary500,
  },
  blockGap: {
    gap: spacing.sm,
  },
  contentText: {
    ...textStyles.body,
    color: colors.textSecondary,
    lineHeight: 25,
  },
  subLabel: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  subText: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  errorHint: {
    ...textStyles.caption,
    color: colors.error,
  },
  pinyin: {
    ...textStyles.meta,
    color: colors.textSecondary,
  },
  vocabItem: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs,
  },
  optionWrap: {
    gap: spacing.sm,
  },
  option: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.primary50,
    padding: spacing.md,
  },
  optionActive: {
    borderColor: colors.primary500,
    backgroundColor: colors.primary100,
  },
  optionTextActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  inlineActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  inlineActionCell: {
    flex: 1,
  },
  completionBridgeCard: {
    gap: spacing.xs,
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
  },
  completionBridgeTitle: {
    ...textStyles.meta,
    color: colors.textPrimary,
  },
  completionBridgeText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
