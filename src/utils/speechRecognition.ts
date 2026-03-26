import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";

type SpeechRecognitionPermissionResponse = {
  granted: boolean;
  status: string;
  canAskAgain: boolean;
  expires: string;
  restricted?: boolean;
};

type SpeechRecognitionEventName =
  | "start"
  | "end"
  | "result"
  | "error"
  | "volumechange";

type SpeechRecognitionListenerMap = {
  start: () => void;
  end: () => void;
  result: (event: ExpoSpeechRecognitionResultEvent) => void;
  error: (event: ExpoSpeechRecognitionErrorEvent) => void;
  volumechange: (event: { value: number }) => void;
};

type SpeechRecognitionSubscription = {
  remove: () => void;
};

type SpeechRecognitionModuleLike = {
  start: (options?: ExpoSpeechRecognitionOptions) => void;
  stop: () => void;
  abort: () => void;
  requestPermissionsAsync: () => Promise<SpeechRecognitionPermissionResponse>;
  isRecognitionAvailable: () => boolean;
  supportsRecording: () => boolean;
  addListener: (
    eventName: SpeechRecognitionEventName,
    listener: (...args: unknown[]) => void,
  ) => SpeechRecognitionSubscription;
};

let speechRecognitionModule: SpeechRecognitionModuleLike | null = null;

try {
  // Expo Go does not include custom native modules. Keep runtime access guarded.
  const runtimeModule = require("expo-speech-recognition") as {
    ExpoSpeechRecognitionModule?: SpeechRecognitionModuleLike;
  };
  speechRecognitionModule = runtimeModule.ExpoSpeechRecognitionModule ?? null;
} catch {
  speechRecognitionModule = null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(speechRecognitionModule);
}

export function isSpeechRecognitionAvailable() {
  return speechRecognitionModule?.isRecognitionAvailable() ?? false;
}

export function supportsSpeechRecording() {
  return speechRecognitionModule?.supportsRecording() ?? false;
}

export async function requestSpeechRecognitionPermissions() {
  if (!speechRecognitionModule) {
    return {
      granted: false,
      status: "unavailable",
      canAskAgain: false,
      expires: "never",
    } as SpeechRecognitionPermissionResponse;
  }
  return speechRecognitionModule.requestPermissionsAsync();
}

export function startSpeechRecognition(options?: ExpoSpeechRecognitionOptions) {
  if (!speechRecognitionModule) {
    return false;
  }
  speechRecognitionModule.start(options);
  return true;
}

export function stopSpeechRecognition() {
  speechRecognitionModule?.stop();
}

export function abortSpeechRecognition() {
  speechRecognitionModule?.abort();
}

export function addSpeechRecognitionListener<K extends SpeechRecognitionEventName>(
  eventName: K,
  listener: SpeechRecognitionListenerMap[K],
) {
  if (!speechRecognitionModule) {
    return null;
  }
  return speechRecognitionModule.addListener(eventName, listener as (...args: unknown[]) => void);
}
