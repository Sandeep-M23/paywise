"use client";

import { useQuery } from "@tanstack/react-query";
import type { FilterOptions } from "@paywise/shared";
import { getData } from "@/utils/services";
import { keys, STABLE } from "@/utils/apis/keys";

export function useFilterOptions() {
  return useQuery({
    queryKey: keys.filters,
    queryFn: () => getData<FilterOptions>("/meta/filters"),
    staleTime: STABLE,
  });
}
