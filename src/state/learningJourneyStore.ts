import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { InputContentType, InputSource } from "./contentInputStore";

export interface JourneyInputSnapshot {
  id: string;
  title: string;
  source: InputSource;
  contentType: InputContentType;
  routeLabel: string;
  recommendedEntryStep: string;
  generatedTaskCount: number;
  lessonId: string | null;
  createdAt: string;
}

export interface JourneySessionSnapshot {
  sessionId: string;
  lessonId: string;
  lessonTitle: string;
  contentInputId?: string;
  contentTitle?: string;
  source?: InputSource;
  totalSteps: number;
  completedAt?: string;
}

export interface JourneyReviewSnapshot {
  completedAt: string;
  completedCount: number;
  mode: "single" | "batch";
}

interface LearningJourneyStoreState {
  hasHydrated: boolean;
  currentInput: JourneyInputSnapshot | null;
  currentSession: JourneySessionSnapshot | null;
  lastCompletedSession: JourneySessionSnapshot | null;
  lastCompletedReview: JourneyReviewSnapshot | null;
  recordGeneratedInput: (input: JourneyInputSnapshot) => void;
  recordSessionStarted: (session: JourneySessionSnapshot) => void;
  recordSessionCompleted: (payload: { sessionId: string; completedAt: string }) => void;
  recordReviewCompleted: (review: JourneyReviewSnapshot) => void;
  clearJourney: () => void;
  setHasHydrated: (ready: boolean) => void;
}

export const useLearningJourneyStore = create<LearningJourneyStoreState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      currentInput: null,
      currentSession: null,
      lastCompletedSession: null,
      lastCompletedReview: null,
      recordGeneratedInput: (input) =>
        set(() => ({
          currentInput: input,
          currentSession: null,
          lastCompletedSession: null,
          lastCompletedReview: null,
        })),
      recordSessionStarted: (session) =>
        set((state) => {
          if (state.currentSession?.sessionId === session.sessionId) {
            return {
              currentSession: {
                ...state.currentSession,
                ...session,
              },
            };
          }
          return {
            currentSession: session,
          };
        }),
      recordSessionCompleted: ({ sessionId, completedAt }) =>
        set((state) => {
          if (!state.currentSession || state.currentSession.sessionId !== sessionId) {
            return state;
          }
          const completedSession = {
            ...state.currentSession,
            completedAt,
          };
          return {
            currentSession: completedSession,
            lastCompletedSession: completedSession,
          };
        }),
      recordReviewCompleted: (review) =>
        set({
          lastCompletedReview: review,
        }),
      clearJourney: () =>
        set({
          currentInput: null,
          currentSession: null,
          lastCompletedSession: null,
          lastCompletedReview: null,
        }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "yuwen-learning-journey-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentInput: state.currentInput,
        currentSession: state.currentSession,
        lastCompletedSession: state.lastCompletedSession,
        lastCompletedReview: state.lastCompletedReview,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
