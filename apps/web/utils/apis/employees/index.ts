"use client";

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import type {
  EmployeeCreateInput,
  EmployeeDetail,
  EmployeeSummary,
  EmployeeUpdateInput,
  Page,
  SalaryRevisionCreateRequest,
} from "@paywise/shared";
import { getData, postData, patchData, toQueryString } from "@/utils/services";
import { keys, useInvalidateEmployeeData } from "@/utils/apis/keys";
import type { DirectoryFilters } from "@/@types";

export const DIRECTORY_BATCH = 50;

export function useEmployeeDirectory(filters: DirectoryFilters) {
  return useInfiniteQuery({
    queryKey: ["employees", "directory", filters],
    queryFn: ({ pageParam }) =>
      getData<Page<EmployeeSummary>>(
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
    queryFn: () => getData<EmployeeDetail>(`/employees/${id}`),
    enabled: id !== null,
  });
}

export function useCreateEmployee() {
  const invalidate = useInvalidateEmployeeData();
  return useMutation({
    mutationFn: (input: EmployeeCreateInput) => postData<EmployeeDetail>("/employees", input),
    onSuccess: invalidate,
  });
}

export function useUpdateEmployee(id: string) {
  const invalidate = useInvalidateEmployeeData();
  return useMutation({
    mutationFn: (patch: EmployeeUpdateInput) =>
      patchData<EmployeeDetail>(`/employees/${id}`, patch),
    onSuccess: invalidate,
  });
}

export function useChangeSalary(id: string) {
  const invalidate = useInvalidateEmployeeData();
  return useMutation({
    mutationFn: (input: SalaryRevisionCreateRequest) =>
      postData<EmployeeDetail>(`/employees/${id}/salary-revisions`, input),
    onSuccess: invalidate,
  });
}

export function useDeactivateEmployee(id: string) {
  const invalidate = useInvalidateEmployeeData();
  return useMutation({
    mutationFn: (reason: string) =>
      postData<EmployeeDetail>(`/employees/${id}/deactivate`, { reason }),
    onSuccess: invalidate,
  });
}

export function useEmployeeSearch(q: string, status: "all" | "active", enabled = true) {
  return useQuery({
    queryKey: ["employees", "search", status, q],
    queryFn: () =>
      getData<Page<EmployeeSummary>>(`/employees${toQueryString({ q, pageSize: 6, status })}`),
    enabled: enabled && q.length >= 2,
    staleTime: 30_000,
  });
}
