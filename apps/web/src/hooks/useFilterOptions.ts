"use client";

import { useQuery } from "@tanstack/react-query";
import type { FilterOptions } from "@paywise/shared";
import { apiRequest } from "@/lib/api-client";
import { keys, STABLE } from "@/lib/query-keys";

export function useFilterOptions() {
  return useQuery({
    queryKey: keys.filters,
    queryFn: () => apiRequest<FilterOptions>("/meta/filters"),
    staleTime: STABLE,
  });
}
