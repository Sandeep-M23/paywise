import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import type { Db } from "../src/config/db";
import { corsOriginsFromEnv } from "../src/config/cors";
import { fixedClock } from "../src/utils/helpers/clock";
import { serve, type TestServer } from "./http";

describe("corsOriginsFromEnv", () => {
  it("allows no cross-origin callers when CORS_ORIGIN is unset", () => {
    expect(corsOriginsFromEnv({})).toEqual([]);
  });

  it("reads a comma-separated list of origins", () => {
    expect(
      corsOriginsFromEnv({ CORS_ORIGIN: "https://paywise.example, http://localhost:3000 " }),
    ).toEqual(["https://paywise.example", "http://localhost:3000"]);
  });
});

describe("CORS", () => {
  let app: TestServer;

  beforeAll(async () => {
    app = await serve(
      createApp({
        db: {} as Db,
        clock: fixedClock("2026-11-23"),
        auth: "disabled",
        corsOrigins: ["https://paywise.example"],
      }),
    );
  });
  afterAll(() => app.close());

  const preflight = (origin: string) =>
    app.request("/api/health", {
      method: "OPTIONS",
      headers: { Origin: origin, "Access-Control-Request-Method": "GET" },
    });

  it("sends no CORS headers to an unlisted origin", async () => {
    const res = await preflight("https://evil.example");
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("allows a listed origin", async () => {
    const res = await preflight("https://paywise.example");
    expect(res.headers.get("access-control-allow-origin")).toBe("https://paywise.example");
  });
});
