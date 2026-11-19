"use client";

import { useQuery } from "@tanstack/react-query";
import type { FairnessQuery, GenderGapGroup, PayOutlier } from "@paywise/shared";
import { api, toQueryString } from "@/utils/services";
import { keys, STABLE } from "@/utils/apis/keys";

export function useGenderGaps(query: FairnessQuery) {
  return useQuery({
    queryKey: [...keys.fairness, "gender-gaps", query],
    queryFn: () => api<GenderGapGroup[]>(`/insights/fairness/gender-gaps${toQueryString(query)}`),
    staleTime: STABLE,
  });
}

export function useOutliers(query: FairnessQuery) {
  return useQuery({
    queryKey: [...keys.fairness, "outliers", query],
    queryFn: () => api<PayOutlier[]>(`/insights/fairness/outliers${toQueryString(query)}`),
    staleTime: STABLE,
  });
}
