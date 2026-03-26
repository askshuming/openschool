import { useQuery } from "@tanstack/react-query";
import { getCatalogApi } from "../api/service";
import { queryKeys } from "../api/queryKeys";

export function useCatalog() {
  return useQuery({
    queryKey: queryKeys.catalog(),
    queryFn: getCatalogApi,
  });
}
