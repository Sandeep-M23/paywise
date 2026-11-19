"use client";

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import type {
  EmployeeCreateInput,
  EmployeeDetail,
  EmployeeListQuery,
  EmployeeSummary,
  EmployeeUpdateInput,
  Page,
  SalaryRevisionCreateRequest,
} from "@paywise/shared";
import { api, toQueryString } from "@/utils/services";
import { keys, useInvalidateEmployeeData } from "@/utils/apis/keys";

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
    mutationFn: (input: SalaryRevisionCreateRequest) =>
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
