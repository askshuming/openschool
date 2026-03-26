import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SessionAnswerResponse } from "../api/contracts";

interface SessionStoreState {
  hasHydrated: boolean;
  sessionId: string | null;
  lessonId: string | null;
  totalSteps: number;
  step: number;
  currentCardTitle: string | null;
  selectedOption: number | null;
  answerResult: SessionAnswerResponse | null;
  hydrateSession: (sessionId: string, lessonId: string, totalSteps: number) => void;
  setCurrentCardTitle: (title: string | null) => void;
  setStep: (step: number) => void;
  setSelectedOption: (index: number | null) => void;
  setAnswerResult: (result: SessionAnswerResponse | null) => void;
  nextStep: () => void;
  resetProgress: () => void;
  clearSession: () => void;
  setHasHydrated: (ready: boolean) => void;
}

export const useSessionStore = create<SessionStoreState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      sessionId: null,
      lessonId: null,
      totalSteps: 0,
      step: 0,
      currentCardTitle: null,
      selectedOption: null,
      answerResult: null,
      hydrateSession: (sessionId, lessonId, totalSteps) =>
        set((state) => {
          if (
            state.sessionId === sessionId &&
            state.lessonId === lessonId &&
            state.totalSteps === totalSteps
          ) {
            return state;
          }
          const canResume =
            state.step > 0 &&
            state.step < totalSteps &&
            state.totalSteps === totalSteps &&
            state.lessonId === lessonId;
          return {
            sessionId,
            lessonId,
            totalSteps,
            step: canResume ? state.step : 0,
            currentCardTitle: canResume ? state.currentCardTitle : null,
            selectedOption: canResume ? state.selectedOption : null,
            answerResult: null,
          };
        }),
      setCurrentCardTitle: (currentCardTitle) => set({ currentCardTitle }),
      setStep: (step) => set({ step }),
      setSelectedOption: (selectedOption) => set({ selectedOption }),
      setAnswerResult: (answerResult) => set({ answerResult }),
      nextStep: () => {
        const current = get().step;
        const totalSteps = get().totalSteps;
        if (current < totalSteps - 1) {
          set({ step: current + 1, selectedOption: null, answerResult: null });
        }
      },
      resetProgress: () => set({ step: 0, selectedOption: null, answerResult: null }),
      clearSession: () =>
        set({
          sessionId: null,
          lessonId: null,
          totalSteps: 0,
          step: 0,
          currentCardTitle: null,
          selectedOption: null,
          answerResult: null,
        }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "yuwen-session-store-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        lessonId: state.lessonId,
        totalSteps: state.totalSteps,
        step: state.step,
        currentCardTitle: state.currentCardTitle,
        selectedOption: state.selectedOption,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
