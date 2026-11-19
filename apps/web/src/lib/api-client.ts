import type { ApiErrorBody } from "@paywise/shared";
import { notifyAuthChange } from "@/context/AuthContext";
import { clearAuthToken, getAuthToken } from "./auth-client";

// Same origin by default: next.config.ts proxies /api/* to the API. Set
// NEXT_PUBLIC_BACKEND_API_URL to call the API directly (it allows any origin,
// since auth is a Bearer header, not a cookie).
export const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

async function send(path: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, headers, ...rest } = init;
  const token = getAuthToken();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        ...(json !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch (err) {
    // fetch() throws (not an HTTP response) when the request never completes:
    // server unreachable, offline. Callers expect ApiError, never a raw TypeError.
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "network_error", "Could not reach the server. Please try again.");
  }

  if (!res.ok) {
    if (res.status === 401) {
      // AuthGate sees the token go and sends the user to sign in.
      clearAuthToken();
      notifyAuthChange();
    }
    // 5xx bodies are server-internal; only 4xx messages are written for people.
    if (res.status >= 500) {
      throw new ApiError(res.status, "server_error", "Something went wrong. Please try again.");
    }
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      body?.error.code ?? "http_error",
      body?.error.message ?? `Request failed (${res.status})`,
      body?.error.details,
    );
  }
  return res;
}

/** JSON request against the API, with the signed-in user's Bearer token. */
export async function apiRequest<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  return (await (await send(path, init)).json()) as T;
}

/**
 * Downloads a file (CSV export, template). A plain <a href> can't send the
 * Bearer header, so fetch it and save the blob under the server's filename.
 */
export async function downloadFile(path: string) {
  const res = await send(path);
  const filename =
    /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "download";
  const url = URL.createObjectURL(await res.blob());
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking at once can cancel the download before the browser has read the blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

type QueryValue = string | number | readonly string[] | undefined | null;

/** Lists become repeated keys (?country=IN&country=DE), which the API reads as a list. */
export function toQueryString(params: Record<string, QueryValue>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) for (const item of value) search.append(key, item);
    else if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
