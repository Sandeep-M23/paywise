import Cookies from "js-cookie";
import { COOKIES } from "@/utils/constants/others/cookies";
import { decodeAuthToken } from "./jwt";

export function saveAuthToken(token: string) {
  const exp = decodeAuthToken(token)?.exp;
  Cookies.set(COOKIES.AUTH_TOKEN, token, {
    path: "/",
    sameSite: "lax",
    secure: window.location.protocol === "https:",
    ...(exp ? { expires: new Date(exp * 1000) } : {}),
  });
}

export function getAuthToken(): string | null {
  if (typeof document === "undefined") return null;
  return Cookies.get(COOKIES.AUTH_TOKEN) ?? null;
}

export function clearAuthToken() {
  Cookies.remove(COOKIES.AUTH_TOKEN, { path: "/" });
}
