import type { ApiErrorBody } from "@paywise/shared";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "/api";
const AUTH_TOKEN_KEY = "auth_token";

export function saveAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

type ApiResult<T> = { ok: true; message: string; data: T } | { ok: false; message: string };

/** Never throws: the login form shows `message` either way. */
export async function loginRequest(payload: {
  email: string;
  password: string;
}): Promise<ApiResult<{ authToken: string; email: string }>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, message: "Could not reach the server. Try again." };
  }

  const body = (await res.json().catch(() => null)) as
    { message?: string; data?: { authToken: string; email: string } } | ApiErrorBody | null;
  if (!res.ok || !body || !("data" in body) || !body.data) {
    const message = body && "error" in body ? body.error.message : undefined;
    return {
      ok: false,
      message: res.status >= 500 || !message ? "Could not sign in. Try again." : message,
    };
  }
  return { ok: true, message: body.message ?? "Signed in", data: body.data };
}
