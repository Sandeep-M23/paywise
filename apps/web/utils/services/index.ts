import axios, { type AxiosRequestConfig } from "axios";
import type { QueryValue } from "@/@types";
import { PATH } from "@/utils/constants/others/paths";
import { clearAuthToken, getAuthToken } from "@/utils/helpers/others/cookies";
import { asyncHandler } from "./asyncHandler";

export { ApiError } from "./api-error";

// Same origin by default: next.config.ts proxies /api/* to the API. Set
// NEXT_PUBLIC_BACKEND_API_URL to call the API directly (it allows any origin,
// since auth is a Bearer header the browser never sends on its own).
export const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "/api";

const client = axios.create({
  baseURL: baseUrl,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  timeout: 60_000,
});

// Every request carries the signed-in user's token.
client.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 means the token expired or was revoked: sign out with a link back here.
// The sign-in call itself is excluded; its 401 just means a wrong password.
client.interceptors.response.use(undefined, (error) => {
  if (error?.response?.status === 401 && !error.config?.url?.endsWith("/auth/login")) {
    clearAuthToken();
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`${PATH.LOGIN}?next=${next}`);
  }
  return Promise.reject(error);
});

export const getData = <T>(endpoint: string, config: AxiosRequestConfig = {}) =>
  asyncHandler(async () => (await client.get<T>(endpoint, config)).data);

export const postData = <T>(endpoint: string, payload?: unknown, config: AxiosRequestConfig = {}) =>
  asyncHandler(async () => (await client.post<T>(endpoint, payload, config)).data);

export const patchData = <T>(
  endpoint: string,
  payload?: unknown,
  config: AxiosRequestConfig = {},
) => asyncHandler(async () => (await client.patch<T>(endpoint, payload, config)).data);

/**
 * Downloads a file (CSV export, template). A plain <a href> can't send the
 * Bearer header, so fetch it and save the blob under the server's filename.
 */
export async function downloadFile(endpoint: string) {
  const res = await asyncHandler(() => client.get<Blob>(endpoint, { responseType: "blob" }));
  const disposition = String(res.headers["content-disposition"] ?? "");
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "download";
  const url = URL.createObjectURL(res.data);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking at once can cancel the download before the browser has read the blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

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
