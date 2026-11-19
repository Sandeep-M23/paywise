"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import type {
  RaiseCost,
  RaiseApplyRequest,
  RaiseApplyResult,
  RaiseCostRequest,
} from "@paywise/shared";
import { api } from "@/utils/services";
import { keys, useInvalidateEmployeeData } from "@/utils/apis/keys";

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
