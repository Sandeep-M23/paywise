import Cookies from "js-cookie";
import { COOKIES } from "@/utils/constants/others/cookies";
import { decodeAuthToken } from "./jwt";

// A cookie (not localStorage) so proxy.ts can redirect signed-out visitors on the
// server. It isn't HttpOnly: the client reads it to send `Authorization: Bearer`,
// and the API never reads cookies, so it can't be used for CSRF.
export function saveAuthToken(token: string) {
  const exp = decodeAuthToken(token)?.exp;
  Cookies.set(COOKIES.AUTH_TOKEN, token, {
    path: "/",
    sameSite: "lax",
    secure: window.location.protocol === "https:",
    // Expires with the token itself, so a stale cookie never outlives it.
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
