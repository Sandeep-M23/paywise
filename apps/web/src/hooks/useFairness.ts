"use client";

import { useQuery } from "@tanstack/react-query";
import type { FairnessQuery, GenderGapGroup, PayOutlier } from "@paywise/shared";
import { apiRequest, toQueryString } from "@/lib/api-client";
import { keys, STABLE } from "@/lib/query-keys";

export function useGenderGaps(query: FairnessQuery) {
  return useQuery({
    queryKey: [...keys.fairness, "gender-gaps", query],
    queryFn: () =>
      apiRequest<GenderGapGroup[]>(`/insights/fairness/gender-gaps${toQueryString(query)}`),
    staleTime: STABLE,
  });
}

export function useOutliers(query: FairnessQuery) {
  return useQuery({
    queryKey: [...keys.fairness, "outliers", query],
    queryFn: () => apiRequest<PayOutlier[]>(`/insights/fairness/outliers${toQueryString(query)}`),
    staleTime: STABLE,
  });
}
