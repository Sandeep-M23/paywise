"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  CountrySummary,
  DepartmentSummary,
  Distribution,
  JobTitleSummary,
} from "@paywise/shared";
import { apiRequest } from "@/lib/api-client";
import { keys, STABLE } from "@/lib/query-keys";

export function useCountrySummaries() {
  return useQuery({
    queryKey: [...keys.insights, "countries"],
    queryFn: () => apiRequest<CountrySummary[]>("/insights/countries"),
    staleTime: STABLE,
  });
}

export function useJobTitleSummaries(country: string) {
  return useQuery({
    queryKey: [...keys.insights, country, "job-titles"],
    queryFn: () => apiRequest<JobTitleSummary[]>(`/insights/countries/${country}/job-titles`),
    staleTime: STABLE,
  });
}

export function useDepartmentSummaries(country: string) {
  return useQuery({
    queryKey: [...keys.insights, country, "departments"],
    queryFn: () => apiRequest<DepartmentSummary[]>(`/insights/countries/${country}/departments`),
    staleTime: STABLE,
  });
}

export function useDistribution(country: string, buckets = 12) {
  return useQuery({
    queryKey: [...keys.insights, country, "distribution", buckets],
    queryFn: () =>
      apiRequest<Distribution>(`/insights/countries/${country}/distribution?buckets=${buckets}`),
    staleTime: STABLE,
  });
}
