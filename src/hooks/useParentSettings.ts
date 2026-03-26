import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../api/queryKeys";
import { getParentSettingsApi } from "../api/service";

export function useParentSettings(parentId?: string) {
  return useQuery({
    queryKey: parentId ? queryKeys.parentSettings(parentId) : ["parent-settings", "missing"],
    queryFn: () => getParentSettingsApi(parentId as string),
    enabled: Boolean(parentId),
  });
}
