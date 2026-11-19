import type { AuthConfig } from "../interfaces/middlewares/auth";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { MiddlewareHandler } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { AppError } from "../utils/helpers/errors";

/*
 * One HR user, configured by environment (REQUIREMENTS: a single sign-in;
 * multi-user roles are out of scope). The session is a signed, httpOnly
 * cookie holding the email and an expiry, so no session table is needed.
 */

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const KEY_LENGTH = 64;
export const SESSION_COOKIE = "paywise_session";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scryptAsync(password, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

export async function startSession(
  c: Parameters<MiddlewareHandler>[0],
  config: AuthConfig,
  email: string,
) {
  const expiresAt = Math.floor(Date.now() / 1000) + config.sessionTtlSeconds;
  await setSignedCookie(c, SESSION_COOKIE, `${email}|${expiresAt}`, config.sessionSecret, {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: "Lax",
    path: "/",
    maxAge: config.sessionTtlSeconds,
  });
}

export function endSession(c: Parameters<MiddlewareHandler>[0]) {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export async function readSession(
  c: Parameters<MiddlewareHandler>[0],
  config: AuthConfig,
): Promise<{ email: string } | null> {
  const value = await getSignedCookie(c, config.sessionSecret, SESSION_COOKIE);
  if (!value) return null;
  const [email, expiresAt] = value.split("|");
  if (!email || Number(expiresAt) < Date.now() / 1000) return null;
  return { email };
}

/** Rejects requests without a valid session, except the listed public paths. */
export function requireSession(config: AuthConfig, publicPaths: string[]): MiddlewareHandler {
  return async (c, next) => {
    if (publicPaths.includes(c.req.path)) return next();
    const session = await readSession(c, config);
    if (!session) throw new AppError(401, "unauthenticated", "Please sign in");
    // Routes that record who did something read it as c.get("userEmail").
    c.set("userEmail", session.email);
    return next();
  };
}
