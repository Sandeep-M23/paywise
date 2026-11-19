"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import type {
  RaiseCost,
  RaiseApplyRequest,
  RaiseApplyResult,
  RaiseCostRequest,
} from "@paywise/shared";
import { postData } from "@/utils/services";
import { keys, useInvalidateEmployeeData } from "@/utils/apis/keys";

export function useRaiseCost(request: RaiseCostRequest | null) {
  return useQuery({
    queryKey: [...keys.insights, "raise-cost", request],
    queryFn: () => postData<RaiseCost[]>("/insights/raise-cost", request),
    enabled: request !== null,
    placeholderData: keepPreviousData,
  });
}

export function useApplyRaises() {
  const invalidate = useInvalidateEmployeeData();
  return useMutation({
    mutationFn: (input: RaiseApplyRequest) =>
      postData<RaiseApplyResult>("/employees/raises", input),
    onSuccess: () => invalidate(),
  });
}
