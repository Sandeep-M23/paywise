"use client";

import { toast } from "sonner";
import { ApiError, downloadFile } from "@/utils/services";

export function useDownload() {
  return (path: string) =>
    downloadFile(path).catch((error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not download the file."),
    );
}
