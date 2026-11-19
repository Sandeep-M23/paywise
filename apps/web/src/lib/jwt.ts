export type AuthUser = { email: string };

type TokenPayload = { user: AuthUser; exp: number };

// Decodes the JWT payload client-side for display and the sign-in gate only.
// The signature is never verified here; the API does that on every request.
export function decodeAuthToken(token: string): AuthUser | null {
  try {
    const [, payloadSegment] = token.split(".");
    const json = atob(payloadSegment!.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as TokenPayload;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload.user?.email ? payload.user : null;
  } catch {
    return null;
  }
}
