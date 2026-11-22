import axios, { type AxiosRequestConfig } from "axios";
import type { QueryValue } from "@/@types";
import { PATH } from "@/utils/constants/others/paths";
import { clearAuthToken, getAuthToken } from "@/utils/helpers/others/cookies";
import { asyncHandler } from "./asyncHandler";

export { ApiError } from "./api-error";

export const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "/api";

const client = axios.create({
  baseURL: baseUrl,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  timeout: 60_000,
});

client.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

export async function downloadFile(endpoint: string) {
  const res = await asyncHandler(() => client.get<Blob>(endpoint, { responseType: "blob" }));
  const disposition = String(res.headers["content-disposition"] ?? "");
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "download";
  const url = URL.createObjectURL(res.data);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function toQueryString(params: Record<string, QueryValue>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) for (const item of value) search.append(key, item);
    else if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
