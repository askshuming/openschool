import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../api/queryKeys";
import { getWeeklyReportByChild } from "../api/service";

export function useWeeklyReport(
  childKey: string,
  childId?: string,
  parentId?: string,
) {
  return useQuery({
    queryKey: queryKeys.weeklyReport(childKey),
    queryFn: () => getWeeklyReportByChild(childId, parentId),
  });
}
