import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../api/queryKeys";
import { getProgressSummaryByChild } from "../api/service";

export function useProgressSummary(childKey: string, childId?: string) {
  return useQuery({
    queryKey: queryKeys.progressSummary(childKey),
    queryFn: () => getProgressSummaryByChild(childId),
  });
}
