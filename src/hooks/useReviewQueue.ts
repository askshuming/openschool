import { useQuery } from "@tanstack/react-query";
import { getReviewQueueApiByChild } from "../api/service";
import { queryKeys } from "../api/queryKeys";

export function useReviewQueue(childKey: string, childId?: string) {
  return useQuery({
    queryKey: [...queryKeys.reviewQueue(), childKey],
    queryFn: () => getReviewQueueApiByChild(childId),
  });
}
