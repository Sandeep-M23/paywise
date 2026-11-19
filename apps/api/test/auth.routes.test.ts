import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import type { AuthConfig } from "../src/interfaces/middlewares/auth";
import { generateToken, hashPassword, verifyHashedPassword } from "../src/utils/auth/auth-utils";
import { fixedClock } from "../src/utils/helpers/clock";
import { createTestDb } from "./db";
import { serve, type TestServer } from "./http";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let app: TestServer;
let auth: AuthConfig;

beforeAll(async () => {
  testDb = await createTestDb();
  auth = {
    email: "hr@acme.test",
    passwordHash: await hashPassword("correct horse"),
    jwtSecret: "test-secret-that-is-long-enough-for-hmac",
    tokenTtlSeconds: 3600,
  };
  app = await serve(createApp({ db: testDb.db, clock: fixedClock("2026-06-30"), auth }));
});
afterAll(async () => {
  await app.close();
  await testDb.close();
});

const login = (email: string, password: string) =>
  app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

const bearer = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const stored = await hashPassword("s3cret");
    expect(stored).toMatch(/^scrypt\$/);
    expect(await verifyHashedPassword("s3cret", stored)).toBe(true);
    expect(await verifyHashedPassword("wrong", stored)).toBe(false);
    expect(await verifyHashedPassword("s3cret", "garbage")).toBe(false);
  });
});

describe("auth", () => {
  it("keeps health public and everything else behind a token", async () => {
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

  it("signs in with a bearer token that unlocks the API", async () => {
    const res = await login("HR@acme.test", "correct horse");
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
    const { data } = (await res.json()) as { data: { authToken: string; email: string } };
    expect(data.email).toBe("hr@acme.test");

    expect((await app.request("/api/employees", bearer(data.authToken))).status).toBe(200);
    expect(await (await app.request("/api/auth/me", bearer(data.authToken))).json()).toEqual({
      email: "hr@acme.test",
    });
  });

  it("rejects a forged, foreign or expired token, and a token without the Bearer scheme", async () => {
    const token = generateToken({ email: "hr@acme.test" }, auth);
    const forged = `${token.slice(0, -4)}AAAA`;
    const foreign = generateToken({ email: "hr@acme.test" }, { ...auth, jwtSecret: "another" });
    const expired = generateToken({ email: "hr@acme.test" }, { ...auth, tokenTtlSeconds: -60 });

    for (const bad of [forged, foreign, expired]) {
      expect((await app.request("/api/employees", bearer(bad))).status).toBe(401);
    }
    const noScheme = { headers: { authorization: token } };
    expect((await app.request("/api/employees", noScheme)).status).toBe(401);
  });
});
