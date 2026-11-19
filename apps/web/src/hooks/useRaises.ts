"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import type {
  RaiseCost,
  RaiseApplyRequest,
  RaiseApplyResult,
  RaiseCostRequest,
} from "@paywise/shared";
import { apiRequest } from "@/lib/api-client";
import { keys, useInvalidateEmployeeData } from "@/lib/query-keys";

export function useRaiseCost(request: RaiseCostRequest | null) {
  return useQuery({
    queryKey: [...keys.insights, "raise-cost", request],
    queryFn: () =>
      apiRequest<RaiseCost[]>("/insights/raise-cost", { method: "POST", json: request }),
    enabled: request !== null,
    placeholderData: keepPreviousData,
  });
}

export function useApplyRaises() {
  const invalidate = useInvalidateEmployeeData();
  return useMutation({
    mutationFn: (input: RaiseApplyRequest) =>
      apiRequest<RaiseApplyResult>("/employees/raises", { method: "POST", json: input }),
    onSuccess: () => invalidate(),
  });
}
