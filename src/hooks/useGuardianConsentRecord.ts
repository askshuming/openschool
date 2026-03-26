import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../api/queryKeys";
import { getGuardianConsentRecordApi } from "../api/service";

export function useGuardianConsentRecord(parentId?: string) {
  return useQuery({
    queryKey: parentId
      ? queryKeys.guardianConsentRecord(parentId)
      : ["guardian-consent-record", "missing"],
    queryFn: () => getGuardianConsentRecordApi(parentId as string),
    enabled: Boolean(parentId),
  });
}
