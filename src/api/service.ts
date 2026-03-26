import {
  ContentAnalyzeRequest,
  ContentAnalyzeResponse,
  ChildProfileDeleteRequest,
  ChildProfileDeleteResponse,
  CatalogResponse,
  GuardianConsentRecordResponse,
  GuardianConsentRevokeRequest,
  GuardianConsentRevokeResponse,
  GuardianConsentRequest,
  GuardianConsentResponse,
  ParentDataExportResponse,
  ParentSignupRequest,
  ParentSignupResponse,
  ParentSettingsResponse,
  ParentSettingsUpdateRequest,
  ProgressSummaryResponse,
  ReviewAnswerRequest,
  ReviewAnswerResponse,
  ReviewQueueResponse,
  SessionAnswerRequest,
  SessionAnswerResponse,
  SessionFinishRequest,
  SessionFinishResponse,
  SessionRecitationRequest,
  SessionRecitationResponse,
  SessionStartRequest,
  SessionStartResponse,
  UpsertChildProfileRequest,
  UpsertChildProfileResponse,
  WeeklyReportResponse,
} from "./contracts";
import {
  deleteChildProfile,
  getCatalog,
  getGuardianConsentRecord,
  revokeGuardianConsent,
  getParentDataExport,
  getProgressSummary,
  getParentSettings,
  getReviewQueue,
  submitReviewAnswer,
  getWeeklyReport,
  finishSession,
  signupParent,
  submitGuardianConsent,
  submitSessionRecitation,
  updateParentSettings,
  upsertChildProfile,
  startSession,
  answerSession,
} from "./mockApi";
import { apiBaseUrl, apiMode } from "../config/env";
import { getJson, postJson } from "./httpClient";
import { analyzeContentFallback } from "./contentAnalyzeFallback";

let activeSessionCache: SessionStartResponse | null = null;
let activeSessionKey: string | null = null;

function sessionKey(input: SessionStartRequest) {
  return `${input.childId}::${input.lessonId}::${input.contentInputId ?? "default"}`;
}

interface StartSessionOptions {
  forceNew?: boolean;
}

export function getApiModeLabel() {
  return apiMode === "remote" ? "HTTP 服务" : "本地 Mock";
}

export function clearSessionCache() {
  activeSessionCache = null;
  activeSessionKey = null;
}

export async function getCatalogApi(): Promise<CatalogResponse> {
  if (apiMode === "local") {
    return getCatalog();
  }
  return getJson<CatalogResponse>(`${apiBaseUrl}/catalog`);
}

export async function analyzeContentApi(
  input: ContentAnalyzeRequest,
): Promise<ContentAnalyzeResponse> {
  const url = `${apiBaseUrl}/content/analyze`;

  if (apiMode === "remote") {
    return postJson<ContentAnalyzeRequest, ContentAnalyzeResponse>(url, input);
  }

  try {
    return await postJson<ContentAnalyzeRequest, ContentAnalyzeResponse>(url, input);
  } catch {
    return analyzeContentFallback(input);
  }
}

export async function signupParentApi(
  input: ParentSignupRequest,
): Promise<ParentSignupResponse> {
  if (apiMode === "local") {
    return signupParent(input);
  }
  return postJson<ParentSignupRequest, ParentSignupResponse>(
    `${apiBaseUrl}/parent/signup`,
    input,
  );
}

export async function submitGuardianConsentApi(
  input: GuardianConsentRequest,
): Promise<GuardianConsentResponse> {
  if (apiMode === "local") {
    return submitGuardianConsent(input);
  }
  return postJson<GuardianConsentRequest, GuardianConsentResponse>(
    `${apiBaseUrl}/consent/guardian`,
    input,
  );
}

export async function getGuardianConsentRecordApi(
  parentId: string,
): Promise<GuardianConsentRecordResponse> {
  if (apiMode === "local") {
    return getGuardianConsentRecord(parentId);
  }
  const query = `?parentId=${encodeURIComponent(parentId)}`;
  return getJson<GuardianConsentRecordResponse>(`${apiBaseUrl}/consent/record${query}`);
}

export async function revokeGuardianConsentApi(
  input: GuardianConsentRevokeRequest,
): Promise<GuardianConsentRevokeResponse> {
  if (apiMode === "local") {
    return revokeGuardianConsent(input);
  }
  return postJson<GuardianConsentRevokeRequest, GuardianConsentRevokeResponse>(
    `${apiBaseUrl}/consent/revoke`,
    input,
  );
}

export async function upsertChildProfileApi(
  input: UpsertChildProfileRequest,
): Promise<UpsertChildProfileResponse> {
  if (apiMode === "local") {
    return upsertChildProfile(input);
  }
  return postJson<UpsertChildProfileRequest, UpsertChildProfileResponse>(
    `${apiBaseUrl}/child-profile`,
    input,
  );
}

export async function startSessionApi(
  input: SessionStartRequest,
  options: StartSessionOptions = {},
): Promise<SessionStartResponse> {
  const key = sessionKey(input);

  if (!options.forceNew && activeSessionCache && activeSessionKey === key) {
    return activeSessionCache;
  }

  let result: SessionStartResponse;
  if (apiMode === "local") {
    result = await startSession({
      ...input,
      forceNew: Boolean(options.forceNew),
    });
  } else {
    result = await postJson<SessionStartRequest, SessionStartResponse>(
      `${apiBaseUrl}/session/start`,
      {
        ...input,
        forceNew: Boolean(options.forceNew),
      },
    );
  }

  activeSessionCache = result;
  activeSessionKey = key;
  return result;
}

export async function answerSessionApi(
  input: SessionAnswerRequest,
): Promise<SessionAnswerResponse> {
  if (apiMode === "local") {
    return answerSession(input);
  }
  return postJson<SessionAnswerRequest, SessionAnswerResponse>(
    `${apiBaseUrl}/session/answer`,
    input,
  );
}

export async function finishSessionApi(
  input: SessionFinishRequest,
): Promise<SessionFinishResponse> {
  if (apiMode === "local") {
    return finishSession(input);
  }
  return postJson<SessionFinishRequest, SessionFinishResponse>(
    `${apiBaseUrl}/session/finish`,
    input,
  );
}

export async function submitSessionRecitationApi(
  input: SessionRecitationRequest,
): Promise<SessionRecitationResponse> {
  if (apiMode === "local") {
    return submitSessionRecitation(input);
  }
  return postJson<SessionRecitationRequest, SessionRecitationResponse>(
    `${apiBaseUrl}/session/recitation`,
    input,
  );
}

export async function getReviewQueueApi(): Promise<ReviewQueueResponse> {
  return getReviewQueueApiByChild();
}

export async function getReviewQueueApiByChild(
  childId?: string,
): Promise<ReviewQueueResponse> {
  if (apiMode === "local") {
    return getReviewQueue(childId);
  }
  const query = childId ? `?childId=${encodeURIComponent(childId)}` : "";
  return getJson<ReviewQueueResponse>(`${apiBaseUrl}/review-queue${query}`);
}

export async function submitReviewAnswerApi(
  input: ReviewAnswerRequest,
): Promise<ReviewAnswerResponse> {
  if (apiMode === "local") {
    return submitReviewAnswer(input);
  }
  return postJson<ReviewAnswerRequest, ReviewAnswerResponse>(
    `${apiBaseUrl}/review/answer`,
    input,
  );
}

export async function getProgressSummaryApi(): Promise<ProgressSummaryResponse> {
  return getProgressSummaryByChild();
}

export async function getProgressSummaryByChild(
  childId?: string,
): Promise<ProgressSummaryResponse> {
  if (apiMode === "local") {
    return getProgressSummary();
  }
  const query = childId ? `?childId=${encodeURIComponent(childId)}` : "";
  return getJson<ProgressSummaryResponse>(`${apiBaseUrl}/progress-summary${query}`);
}

export async function getWeeklyReportApi(): Promise<WeeklyReportResponse> {
  return getWeeklyReportByChild();
}

export async function getWeeklyReportByChild(
  childId?: string,
  parentId?: string,
): Promise<WeeklyReportResponse> {
  if (apiMode === "local") {
    return getWeeklyReport(childId);
  }
  const params = new URLSearchParams();
  if (childId) params.set("childId", childId);
  if (parentId) params.set("parentId", parentId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return getJson<WeeklyReportResponse>(`${apiBaseUrl}/parent/weekly-report${query}`);
}

export async function getParentSettingsApi(
  parentId: string,
): Promise<ParentSettingsResponse> {
  if (apiMode === "local") {
    return getParentSettings(parentId);
  }
  const query = `?parentId=${encodeURIComponent(parentId)}`;
  return getJson<ParentSettingsResponse>(`${apiBaseUrl}/parent/settings${query}`);
}

export async function updateParentSettingsApi(
  input: ParentSettingsUpdateRequest,
): Promise<ParentSettingsResponse> {
  if (apiMode === "local") {
    return updateParentSettings(input);
  }
  return postJson<ParentSettingsUpdateRequest, ParentSettingsResponse>(
    `${apiBaseUrl}/parent/settings`,
    input,
  );
}

export async function getParentDataExportApi(
  parentId: string,
  childId: string,
): Promise<ParentDataExportResponse> {
  if (apiMode === "local") {
    return getParentDataExport(parentId, childId);
  }
  const params = new URLSearchParams({
    parentId,
    childId,
  });
  return getJson<ParentDataExportResponse>(`${apiBaseUrl}/parent/export-data?${params.toString()}`);
}

export async function deleteChildProfileApi(
  input: ChildProfileDeleteRequest,
): Promise<ChildProfileDeleteResponse> {
  if (apiMode === "local") {
    return deleteChildProfile(input);
  }
  return postJson<ChildProfileDeleteRequest, ChildProfileDeleteResponse>(
    `${apiBaseUrl}/child-profile/delete`,
    input,
  );
}
