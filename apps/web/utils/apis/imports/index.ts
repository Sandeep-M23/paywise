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

export const previewImport = (request: ImportRequest) =>
  postData<ImportPreview>("/imports/preview", request);

export const commitImport = (request: ImportRequest) => postData<ImportResult>("/imports", request);
