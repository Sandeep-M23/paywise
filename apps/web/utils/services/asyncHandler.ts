import { AxiosError } from "axios";
import type { ApiErrorBody } from "@paywise/shared";
import { ApiError } from "./api-error";

export async function asyncHandler<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toApiError(error);
  }
}

function toApiError(error: unknown): unknown {
  if (!(error instanceof AxiosError)) return error;
  if (error.code === AxiosError.ERR_CANCELED) return error;
  const status = error.response?.status;
  if (!status) {
    return new ApiError(0, "network_error", "Could not reach the server. Please try again.");
  }
  if (status >= 500) {
    return new ApiError(status, "server_error", "Something went wrong. Please try again.");
  }
  const body = error.response?.data as ApiErrorBody | undefined;
  return new ApiError(
    status,
    body?.error?.code ?? "http_error",
    body?.error?.message ?? `Request failed (${status})`,
    body?.error?.details,
  );
}
