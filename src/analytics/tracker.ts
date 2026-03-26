import AsyncStorage from "@react-native-async-storage/async-storage";

const ANALYTICS_KEY = "yuwen-analytics-events-v1";
const MAX_EVENTS = 400;

export interface AppAnalyticsEventMap {
  home_start_tap: {
    lessonId: string;
    source:
      | "home_primary"
      | "home_course_list"
      | "home_camera_generate"
      | "home_upload_generate";
  };
  session_started: {
    sessionId: string;
    lessonId: string;
    cardCount: number;
  };
  card_viewed: {
    sessionId: string;
    lessonId: string;
    cardId: string;
    cardType: string;
    step: number;
    totalSteps: number;
  };
  answer_submitted: {
    sessionId: string;
    lessonId: string;
    questionId: string;
    selectedIndex: number;
  };
  feedback_viewed: {
    sessionId: string;
    lessonId: string;
    cardId: string;
  };
  review_completed: {
    mode: "single" | "batch";
    completedCount: number;
  };
  review_item_skipped: {
    mode: "batch";
    reviewId: string;
    step: number;
    totalSteps: number;
  };
  session_paused: {
    sessionId: string;
    lessonId: string;
    step: number;
    totalSteps: number;
  };
  weekly_report_opened: {
    parentId: string;
    childId: string;
  };
}

export type AppAnalyticsEventName = keyof AppAnalyticsEventMap;

export interface TrackedEvent<K extends AppAnalyticsEventName = AppAnalyticsEventName> {
  id: string;
  name: K;
  payload: AppAnalyticsEventMap[K];
  createdAt: string;
}

let writeQueue: Promise<void> = Promise.resolve();

function eventId() {
  return `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

async function appendEvent(event: TrackedEvent) {
  const raw = await AsyncStorage.getItem(ANALYTICS_KEY);
  const list = raw ? (JSON.parse(raw) as TrackedEvent[]) : [];
  list.push(event);
  const next = list.slice(-MAX_EVENTS);
  await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(next));
}

export function trackEvent<K extends AppAnalyticsEventName>(
  name: K,
  payload: AppAnalyticsEventMap[K],
) {
  const event: TrackedEvent<K> = {
    id: eventId(),
    name,
    payload,
    createdAt: new Date().toISOString(),
  };
  writeQueue = writeQueue
    .then(() => appendEvent(event))
    .catch(() => {
      // Ignore local analytics write failures.
    });
}

export async function readTrackedEvents(limit = 50) {
  const raw = await AsyncStorage.getItem(ANALYTICS_KEY);
  const list = raw ? (JSON.parse(raw) as TrackedEvent[]) : [];
  return list.slice(-Math.max(1, limit));
}

export async function clearTrackedEvents() {
  await AsyncStorage.removeItem(ANALYTICS_KEY);
}
