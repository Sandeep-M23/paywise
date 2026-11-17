import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { hashPassword, verifyPassword, type AuthConfig } from "../src/lib/auth";
import { fixedClock } from "../src/lib/clock";
import { createTestDb } from "./db";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  testDb = await createTestDb();
  const auth: AuthConfig = {
    email: "hr@acme.test",
    passwordHash: await hashPassword("correct horse"),
    sessionSecret: "test-secret-that-is-long-enough-for-hmac",
    secureCookies: false,
    sessionTtlSeconds: 3600,
  };
  app = createApp({ db: testDb.db, clock: fixedClock("2026-06-30"), auth });
});
afterAll(() => testDb.close());

const login = (email: string, password: string) =>
  app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const stored = await hashPassword("s3cret");
    expect(stored).toMatch(/^scrypt\$/);
    expect(await verifyPassword("s3cret", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
    expect(await verifyPassword("s3cret", "garbage")).toBe(false);
  });
});

describe("auth", () => {
  it("keeps health public and everything else behind a session", async () => {
    expect((await app.request("/api/health")).status).toBe(200);
    expect((await app.request("/api/employees")).status).toBe(401);
    expect((await app.request("/api/auth/me")).status).toBe(401);
  });

  it("rejects wrong credentials without saying which part was wrong", async () => {
    for (const res of [
      await login("hr@acme.test", "nope"),
      await login("x@acme.test", "correct horse"),
    ]) {
      expect(res.status).toBe(401);
      expect(((await res.json()) as { error: { message: string } }).error.message).toBe(
        "Email or password is incorrect",
      );
    }
  });

  it("signs in with an httpOnly cookie that unlocks the API", async () => {
    const res = await login("HR@acme.test", "correct horse");
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/paywise_session=/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);

    const cookie = setCookie.split(";")[0]!;
    expect((await app.request("/api/employees", { headers: { cookie } })).status).toBe(200);
    expect(await (await app.request("/api/auth/me", { headers: { cookie } })).json()).toEqual({
      email: "hr@acme.test",
    });
  });

  it("rejects a tampered cookie", async () => {
    const cookie = "paywise_session=hr%40acme.test%7C9999999999.forged";
    expect((await app.request("/api/employees", { headers: { cookie } })).status).toBe(401);
  });

  it("clears the cookie on logout", async () => {
    const res = await app.request("/api/auth/logout", { method: "POST" });
    expect(res.status).toBe(401); // logout itself requires a session
    const signedIn = (await login("hr@acme.test", "correct horse")).headers.get("set-cookie")!;
    const out = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { cookie: signedIn.split(";")[0]! },
    });
    expect(out.headers.get("set-cookie")).toMatch(/paywise_session=;.*Max-Age=0/);
  });
});
