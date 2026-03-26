export const queryKeys = {
  catalog: () => ["catalog"] as const,
  session: (childKey: string) => ["session", childKey] as const,
  reviewQueue: () => ["review-queue"] as const,
  progressSummary: (childKey: string) => ["progress-summary", childKey] as const,
  weeklyReport: (childKey: string) => ["weekly-report", childKey] as const,
  parentSettings: (parentId: string) => ["parent-settings", parentId] as const,
  guardianConsentRecord: (parentId: string) => ["guardian-consent-record", parentId] as const,
};
