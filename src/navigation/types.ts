import type { ChildProfileInput } from "../state/AppState";

export type OnboardingGoal = "reading" | "writing" | "expression" | "comprehensive";
export type OnboardingLevel = "support_needed" | "steady" | "advanced";

export type AppTabParamList = {
  Home:
    | {
        celebrationAt?: string;
        celebrationLessonTitle?: string;
        reviewCompletedAt?: string;
        reviewCompletedCount?: number;
        reviewCompletedMode?: "single" | "batch";
        reviewRemainingPendingCount?: number;
      }
    | undefined;
  Session:
    | {
        forceNew?: boolean;
        lessonId?: string;
        generationSource?: "camera" | "upload";
        contentInputId?: string;
      }
    | undefined;
  Review:
    | {
        focusReviewId?: string;
      }
    | undefined;
  Parent: undefined;
};

export type RootStackParamList = {
  OnboardingGrade: undefined;
  OnboardingGoal: {
    grade: ChildProfileInput["grade"];
  };
  OnboardingLevel: {
    grade: ChildProfileInput["grade"];
    goal: OnboardingGoal;
  };
  OnboardingNickname: {
    grade: ChildProfileInput["grade"];
    goal: OnboardingGoal;
    level: OnboardingLevel;
  };
  ParentLogin: undefined;
  GuardianConsent: undefined;
  ChildProfile: undefined;
  MainTabs: undefined;
};
