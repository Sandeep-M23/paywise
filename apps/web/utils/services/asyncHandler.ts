import { AxiosError } from "axios";
import type { ApiErrorBody } from "@paywise/shared";
import { ApiError } from "./api-error";

/**
 * Runs a request and turns every failure into an ApiError, so callers (TanStack
 * Query, forms) handle one error type. Unlike a toast-and-swallow handler it
 * rethrows: retries, form field errors and toasts are decided by the caller.
 */
export async function asyncHandler<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toApiError(error);
  }
}

function toApiError(error: unknown): unknown {
  if (!(error instanceof AxiosError)) return error;
  // Aborted by the caller (TanStack Query cancelling a stale request): not a failure.
  if (error.code === AxiosError.ERR_CANCELED) return error;
  const status = error.response?.status;
  // No response at all: server unreachable or offline.
  if (!status) {
    return new ApiError(0, "network_error", "Could not reach the server. Please try again.");
  }
  // 5xx bodies are server-internal; only 4xx messages are written for people.
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
