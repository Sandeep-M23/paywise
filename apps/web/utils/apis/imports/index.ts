"use client";

import { useQuery } from "@tanstack/react-query";
import type { ImportDetail, ImportLogEntry } from "@paywise/shared";
import { api } from "@/utils/services";
import { keys } from "@/utils/apis/keys";

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
