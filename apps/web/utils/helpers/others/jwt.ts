import type { AuthUser, TokenPayload } from "@/@types";

function readPayload(token: string): TokenPayload | null {
  try {
    const [, payloadSegment] = token.split(".");
    const json = atob(payloadSegment!.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

export function decodeAuthToken(token: string): (AuthUser & { exp: number }) | null {
  const payload = readPayload(token);
  if (!payload?.exp || payload.exp * 1000 < Date.now() || !payload.user?.email) return null;
  return { ...payload.user, exp: payload.exp };
}
