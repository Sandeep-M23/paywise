"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  ImportDetail,
  ImportLogEntry,
  ImportPreview,
  ImportRequest,
  ImportResult,
} from "@paywise/shared";
import { apiRequest } from "@/lib/api-client";
import { keys } from "@/lib/query-keys";

export function useImportDetail(id: string | null) {
  return useQuery({
    queryKey: [...keys.imports, id],
    queryFn: () => apiRequest<ImportDetail>(`/imports/${id}`),
    enabled: id !== null,
  });
}

export function useImportLog() {
  return useQuery({
    queryKey: keys.imports,
    queryFn: () => apiRequest<ImportLogEntry[]>("/imports"),
  });
}

/** Validates every row on the server; nothing is saved. */
export const previewImport = (request: ImportRequest) =>
  apiRequest<ImportPreview>("/imports/preview", { method: "POST", json: request });

/** Saves the import in one transaction: all rows or none. */
export const commitImport = (request: ImportRequest) =>
  apiRequest<ImportResult>("/imports", { method: "POST", json: request });
