"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CountrySummary,
  DepartmentSummary,
  Distribution,
  EmployeeCreateInput,
  EmployeeDetail,
  EmployeeListQuery,
  EmployeeSummary,
  EmployeeUpdateInput,
  FairnessQuery,
  FilterOptions,
  GenderGapGroup,
  ImportDetail,
  ImportLogEntry,
  JobTitleSummary,
  Page,
  PayOutlier,
  RaiseCost,
  RaiseApplyRequest,
  RaiseApplyResult,
  RaiseCostRequest,
  SalaryRevisionCreateInput,
} from "@paywise/shared";
import { api, toQueryString } from "./api";

// Aggregates change only when data changes, and every mutation invalidates
// them, so they can be served from cache for a while.
const STABLE = 5 * 60_000;

export const keys = {
  employees: ["employees"] as const,
  employee: (id: string) => ["employees", "detail", id] as const,
  filters: ["meta", "filters"] as const,
  insights: ["insights"] as const,
  fairness: ["fairness"] as const,
  imports: ["imports"] as const,
};

export const DIRECTORY_BATCH = 50;
export type DirectoryFilters = Omit<EmployeeListQuery, "page" | "pageSize">;

/**
 * The directory loads 50 people at a time as the user scrolls. Uses the same
 * paged endpoint; the previous list stays on screen while a new filter loads.
 */
export function useEmployeeDirectory(filters: DirectoryFilters) {
  return useInfiniteQuery({
    queryKey: ["employees", "directory", filters],
    queryFn: ({ pageParam }) =>
      api<Page<EmployeeSummary>>(
        `/employees${toQueryString({ ...filters, page: pageParam, pageSize: DIRECTORY_BATCH })}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    placeholderData: keepPreviousData,
  });
}

export function useEmployee(id: string | null) {
  return useQuery({
    queryKey: keys.employee(id ?? ""),
    queryFn: () => api<EmployeeDetail>(`/employees/${id}`),
    enabled: id !== null,
  });
}

export function useFilterOptions() {
  return useQuery({
    queryKey: keys.filters,
    queryFn: () => api<FilterOptions>("/meta/filters"),
    staleTime: STABLE,
  });
}

export function useCountrySummaries() {
  return useQuery({
    queryKey: [...keys.insights, "countries"],
    queryFn: () => api<CountrySummary[]>("/insights/countries"),
    staleTime: STABLE,
  });
}

export function useJobTitleSummaries(country: string) {
  return useQuery({
    queryKey: [...keys.insights, country, "job-titles"],
    queryFn: () => api<JobTitleSummary[]>(`/insights/countries/${country}/job-titles`),
    staleTime: STABLE,
  });
}

export function useDepartmentSummaries(country: string) {
  return useQuery({
    queryKey: [...keys.insights, country, "departments"],
    queryFn: () => api<DepartmentSummary[]>(`/insights/countries/${country}/departments`),
    staleTime: STABLE,
  });
}

export function useDistribution(country: string, buckets = 12) {
  return useQuery({
    queryKey: [...keys.insights, country, "distribution", buckets],
    queryFn: () =>
      api<Distribution>(`/insights/countries/${country}/distribution?buckets=${buckets}`),
    staleTime: STABLE,
  });
}

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

export function useRaiseCost(request: RaiseCostRequest | null) {
  return useQuery({
    queryKey: [...keys.insights, "raise-cost", request],
    queryFn: () => api<RaiseCost[]>("/insights/raise-cost", { method: "POST", json: request }),
    enabled: request !== null,
    placeholderData: keepPreviousData,
  });
}

export function useApplyRaises() {
  const invalidate = useInvalidateEmployeeData();
  return useMutation({
    mutationFn: (input: RaiseApplyRequest) =>
      api<RaiseApplyResult>("/employees/raises", { method: "POST", json: input }),
    onSuccess: () => invalidate(),
  });
}

export function useImportDetail(id: string | null) {
  return useQuery({
    queryKey: [...keys.imports, id],
    queryFn: () => api<ImportDetail>(`/imports/${id}`),
    enabled: id !== null,
  });
}

export function useImportLog() {
  return useQuery({ queryKey: keys.imports, queryFn: () => api<ImportLogEntry[]>("/imports") });
}

/** After any write, everything derived from employee data is stale. */
export function useInvalidateEmployeeData() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: keys.employees }),
      client.invalidateQueries({ queryKey: keys.insights }),
      client.invalidateQueries({ queryKey: keys.fairness }),
      client.invalidateQueries({ queryKey: keys.filters }),
      client.invalidateQueries({ queryKey: keys.imports }),
    ]);
}

export function useCreateEmployee() {
  const invalidate = useInvalidateEmployeeData();
  return useMutation({
    mutationFn: (input: EmployeeCreateInput) =>
      api<EmployeeDetail>("/employees", { method: "POST", json: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateEmployee(id: string) {
  const invalidate = useInvalidateEmployeeData();
  return useMutation({
    mutationFn: (patch: EmployeeUpdateInput) =>
      api<EmployeeDetail>(`/employees/${id}`, { method: "PATCH", json: patch }),
    onSuccess: invalidate,
  });
}

export function useChangeSalary(id: string) {
  const invalidate = useInvalidateEmployeeData();
  return useMutation({
    mutationFn: (input: SalaryRevisionCreateInput) =>
      api<EmployeeDetail>(`/employees/${id}/salary-revisions`, { method: "POST", json: input }),
    onSuccess: invalidate,
  });
}

export function useDeactivateEmployee(id: string) {
  const invalidate = useInvalidateEmployeeData();
  return useMutation({
    mutationFn: (reason: string) =>
      api<EmployeeDetail>(`/employees/${id}/deactivate`, { method: "POST", json: { reason } }),
    onSuccess: invalidate,
  });
}
