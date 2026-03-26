import { ChildProfileInput } from "../state/AppState";

export type SkillTag =
  | "vocab"
  | "sentence_understanding"
  | "structure"
  | "main_idea"
  | "evidence_locating"
  | "recitation";

export type ActivityCardType =
  | "intro"
  | "vocab"
  | "close_reading"
  | "main_idea"
  | "quiz"
  | "feedback"
  | "recitation"
  | "summary";

export type StudyRouteKind =
  | "text_reading"
  | "reading_quiz"
  | "writing_prompt"
  | "vocab_foundation";

export interface ActivityCard {
  id: string;
  type: ActivityCardType;
  skillTag: SkillTag;
  payload: {
    title: string;
    body?: string;
    goals?: string[];
    vocabItems?: { word: string; pinyin: string; explanation: string; example: string }[];
    paragraph?: string;
    simpleExplanation?: string;
    structure?: string[];
    mainIdea?: string;
    questionId?: string;
    options?: string[];
    retryQuestion?: string;
    segmentId?: string;
    recitationText?: string;
    recitationTip?: string;
    durationSec?: number;
    mastered?: string[];
    nextReview?: string;
    correctIndex?: number;
    evidenceText?: string;
    whyWrong?: string;
  };
}

export interface SessionGenerationContext {
  contentInputId?: string;
  sourceTitle: string;
  sourceSummary: string;
  contentType: "textbook" | "worksheet" | "photo" | "pdf";
  recognizedFocus: string;
  recognizedGradeLabel: string;
  recognizedTextSnippet?: string;
  matchedLessonTitle?: string;
  routeKind?: StudyRouteKind;
  routeLabel?: string;
  primaryChallenge?: string;
  recommendedEntryStep?: string;
  tags?: string[];
}

export interface ParentSignupRequest {
  account: string;
  code: string;
}

export interface ParentSignupResponse {
  requestId: string;
  parentId: string;
}

export interface GuardianConsentRequest {
  parentId: string;
  relation: "father" | "mother" | "other_guardian";
  childUnder14: boolean;
  agreed: boolean;
}

export interface GuardianConsentResponse {
  requestId: string;
  consentId: string;
  agreedAt: string;
}

export interface GuardianConsentRecordResponse {
  requestId: string;
  consentId: string;
  parentId: string;
  relation: "father" | "mother" | "other_guardian";
  childUnder14: boolean;
  agreed: boolean;
  agreedAt: string;
  revokedAt?: string;
}

export interface GuardianConsentRevokeRequest {
  parentId: string;
}

export interface GuardianConsentRevokeResponse {
  requestId: string;
  consentId: string;
  parentId: string;
  status: "revoked";
  revokedAt: string;
}

export interface UpsertChildProfileRequest extends ChildProfileInput {
  parentId: string;
}

export interface UpsertChildProfileResponse {
  requestId: string;
  childId: string;
}

export interface CatalogLesson {
  id: string;
  title: string;
  unitId: string;
  focusSkillTag: SkillTag;
  parentSuggestion: string;
}

export interface CatalogResponse {
  requestId: string;
  grades: string[];
  textbookVersions: string[];
  lessons: CatalogLesson[];
}

export interface SessionStartRequest {
  childId: string;
  lessonId: string;
  contentInputId?: string;
  generationContext?: SessionGenerationContext;
  forceNew?: boolean;
}

export interface SessionStartResponse {
  requestId: string;
  sessionId: string;
  lessonId: string;
  cards: ActivityCard[];
}

export interface SessionAnswerRequest {
  sessionId: string;
  questionId: string;
  selectedIndex: number;
}

export interface SessionAnswerResponse {
  requestId: string;
  correct: boolean;
  skillTag: SkillTag;
  errorTag?: "evidence_missed" | "main_idea_off";
  feedback: {
    whyWrong: string;
    evidenceText: string;
    retryQuestion: string;
  };
}

export interface SessionFinishRequest {
  sessionId: string;
  completed: boolean;
}

export interface SessionFinishResponse {
  requestId: string;
  sessionId: string;
  status: "finished";
}

export interface SessionRecitationRequest {
  childId: string;
  lessonId: string;
  segmentId?: string;
  durationSec?: number;
}

export interface SessionRecitationResponse {
  requestId: string;
  status: "recorded";
  segmentId: string;
  completedAt: string;
  message: string;
}

export type ContentAnalysisMethod =
  | "vision_ocr"
  | "pdf_text"
  | "text_decode"
  | "heuristic";

export type ContentAnalysisConfidence = "high" | "medium" | "low";

export type ContentInputType = "textbook" | "worksheet" | "photo" | "pdf";

export interface ContentAnalyzeRequest {
  source: "camera" | "upload";
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  preferredContentType?: ContentInputType;
  gradeLabel: string;
  focusLabel: string;
  readingLevel?: string;
  assetBase64?: string;
}

export interface ContentAnalyzeResponse {
  requestId: string;
  contentType: ContentInputType;
  title: string;
  summary: string;
  routeKind: StudyRouteKind;
  routeLabel: string;
  primaryChallenge: string;
  recommendedEntryStep: string;
  recognizedFocus: string;
  recognizedGradeLabel: string;
  generatedTaskCount: number;
  textbookVersion?: string;
  recommendedLessonId?: string | null;
  matchedLessonTitle?: string;
  analysisMethod: ContentAnalysisMethod;
  confidence: ContentAnalysisConfidence;
  recognizedTextSnippet?: string;
  tags: string[];
}

export type ReviewTargetType =
  | "vocab"
  | "evidence_locating"
  | "main_idea"
  | "recitation";

export type ReviewDueAt = "today" | "tomorrow" | "3d" | "7d";

export interface ReviewPracticeFeedback {
  correctMessage: string;
  wrongMessage: string;
  evidence: string;
}

export interface ReviewPracticePayload {
  stem: string;
  options: string[];
}

export interface ReviewQueueItem {
  id: string;
  targetType: ReviewTargetType;
  title: string;
  dueAt: ReviewDueAt;
  status: "pending" | "done";
  difficulty: "basic" | "medium" | "advanced";
  practice: ReviewPracticePayload;
}

export interface ReviewQueueResponse {
  requestId: string;
  items: ReviewQueueItem[];
}

export interface ReviewAnswerRequest {
  childId: string;
  reviewId: string;
  selectedIndex: number;
}

export interface ReviewAnswerResponse {
  requestId: string;
  reviewId: string;
  correct: boolean;
  status: "pending" | "done";
  nextDueAt: ReviewDueAt;
  feedback: {
    message: string;
    evidence: string;
  };
}

export interface ProgressSummaryResponse {
  requestId: string;
  completedLessons: number;
  averageDurationMin: number;
  masteredTags: SkillTag[];
}

export interface WeeklyReportResponse {
  requestId: string;
  weeklyCompletedLessons: number;
  averageDurationMin: number;
  errorDistribution: {
    vocab_unknown: number;
    evidence_missed: number;
    main_idea_off: number;
  };
  recitation: {
    completedCount: number;
    unstableSegments: string[];
  };
}

export interface ParentSettingsResponse {
  requestId: string;
  parentId: string;
  studyDurationLimitMin: number;
  reminderTime: string;
  updatedAt: string;
}

export interface ParentSettingsUpdateRequest {
  parentId: string;
  studyDurationLimitMin: number;
  reminderTime: string;
}

export interface ParentDataExportResponse {
  requestId: string;
  parentId: string;
  childId: string;
  exportedAt: string;
  profile: {
    nickname: string;
    grade: "G1" | "G2" | "G3" | "G4" | "G5" | "G6";
    textbookVersion: string;
    interests: string[];
    readingLevel: "normal" | "struggling" | "very_struggling";
  };
  progressSummary: {
    completedLessons: number;
    averageDurationMin: number;
    masteredTags: SkillTag[];
  };
  weeklyReport: {
    weeklyCompletedLessons: number;
    averageDurationMin: number;
  };
  attemptsCount: number;
  recitationsCount: number;
}

export interface ChildProfileDeleteRequest {
  parentId: string;
  childId: string;
}

export interface ChildProfileDeleteResponse {
  requestId: string;
  childId: string;
  status: "deleted";
  deletedAt: string;
}
