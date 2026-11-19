export type AuthUser = { email: string };

export type TokenPayload = { user: AuthUser; exp: number };

export type LoginResponse = { authToken: string; email: string };

export type ApiResult<T> = { ok: true; message: string; data: T } | { ok: false; message: string };
