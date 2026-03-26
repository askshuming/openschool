import * as Speech from "expo-speech";
import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { ActivityCard } from "../api/contracts";
import { buildRecitationAssessment, RecitationAssessment, toSpeechErrorMessage } from "../domain/recitationAssessment";
import { toUserErrorMessage } from "../utils/errorMessage";
import {
  abortSpeechRecognition,
  addSpeechRecognitionListener,
  isSpeechRecognitionAvailable,
  isSpeechRecognitionSupported,
  requestSpeechRecognitionPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
} from "../utils/speechRecognition";

interface UseRecitationControllerArgs {
  card: ActivityCard | undefined;
  isSubmitting: boolean;
  onSubmitRecitation: (card: ActivityCard, transcript: string) => Promise<void>;
}

export function useRecitationController({
  card,
  isSubmitting,
  onSubmitRecitation,
}: UseRecitationControllerArgs) {
  const [recitationDone, setRecitationDone] = useState(false);
  const [recitationRecognizing, setRecitationRecognizing] = useState(false);
  const [recitationTranscript, setRecitationTranscript] = useState("");
  const [recitationFinalTranscript, setRecitationFinalTranscript] = useState("");
  const [recitationError, setRecitationError] = useState<string | null>(null);
  const [recitationVolume, setRecitationVolume] = useState(0);
  const [pendingRecitationFinalize, setPendingRecitationFinalize] = useState(false);
  const [recitationAssessment, setRecitationAssessment] = useState<RecitationAssessment | null>(null);

  const recitationSupportText = useMemo(() => {
    return isSpeechRecognitionSupported()
      ? isSpeechRecognitionAvailable()
        ? "原生语音识别已就绪"
        : "当前设备暂时不可用语音识别"
      : "当前预览环境不支持原生语音识别";
  }, []);

  const showRecitationPreviewFallback = useMemo(
    () => !isSpeechRecognitionSupported() || !isSpeechRecognitionAvailable(),
    [],
  );

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
      setRecitationError(toSpeechErrorMessage(event.message));
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

  useEffect(
    () => () => {
      Speech.stop();
      abortSpeechRecognition();
    },
    [],
  );

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

  async function completeRecitationAttempt(currentCard: ActivityCard, transcript: string) {
    setRecitationError(null);
    try {
      await onSubmitRecitation(currentCard, transcript);
      const assessment = buildRecitationAssessment(currentCard.payload.recitationText ?? "", transcript);
      setRecitationAssessment(assessment);
      setRecitationDone(true);
    } catch (error) {
      setRecitationError(toUserErrorMessage(error, "朗读记录失败，请重试。"));
    }
  }

  async function startRecitationCapture() {
    if (!card || card.type !== "recitation" || !card.payload.recitationText) {
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
        card.payload.recitationText,
        ...card.payload.recitationText.split(/[，。！？；：、]/).filter(Boolean),
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

  function toggleRecitationCapture() {
    if (isSubmitting) {
      return;
    }
    if (recitationRecognizing) {
      stopRecitationCapture();
      return;
    }
    void startRecitationCapture();
  }

  function completeRecitationForPreview() {
    if (!card || card.type !== "recitation" || isSubmitting) {
      return;
    }
    void completeRecitationAttempt(card, card.payload.recitationText ?? "");
  }

  function playRecitationSample() {
    if (!card || card.type !== "recitation" || !card.payload.recitationText) {
      return;
    }
    stopSpeechRecognition();
    setRecitationRecognizing(false);
    setPendingRecitationFinalize(false);
    Speech.stop();
    Speech.speak(card.payload.recitationText, {
      language: "zh-CN",
      rate: 0.92,
      pitch: 1,
    });
  }

  function resetRecitation() {
    Speech.stop();
    abortSpeechRecognition();
    setRecitationDone(false);
    setRecitationRecognizing(false);
    setRecitationTranscript("");
    setRecitationFinalTranscript("");
    setRecitationError(null);
    setRecitationVolume(0);
    setPendingRecitationFinalize(false);
    setRecitationAssessment(null);
  }

  return {
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
  };
}
