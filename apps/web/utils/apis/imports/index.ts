"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  ImportDetail,
  ImportLogEntry,
  ImportPreview,
  ImportRequest,
  ImportResult,
} from "@paywise/shared";
import { getData, postData } from "@/utils/services";
import { keys } from "@/utils/apis/keys";

export function useImportDetail(id: string | null) {
  return useQuery({
    queryKey: [...keys.imports, id],
    queryFn: () => getData<ImportDetail>(`/imports/${id}`),
    enabled: id !== null,
  });
}

export function useImportLog() {
  return useQuery({
    queryKey: keys.imports,
    queryFn: () => getData<ImportLogEntry[]>("/imports"),
  });
}

/** Validates every row on the server; nothing is saved. */
export const previewImport = (request: ImportRequest) =>
  postData<ImportPreview>("/imports/preview", request);

/** Saves the import in one transaction: all rows or none. */
export const commitImport = (request: ImportRequest) => postData<ImportResult>("/imports", request);
