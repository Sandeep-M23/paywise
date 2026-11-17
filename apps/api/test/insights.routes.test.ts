import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { fixedClock } from "../src/lib/clock";
import { createTestDb } from "./db";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  testDb = await createTestDb();
  app = createApp({ db: testDb.db, clock: fixedClock("2026-06-30") });
});
afterAll(() => testDb.close());

describe("insight routes", () => {
  it("accepts lower-case country codes", async () => {
    expect((await app.request("/api/insights/countries/in/job-titles")).status).toBe(200);
  });

  it("returns 404 for unsupported countries", async () => {
    expect((await app.request("/api/insights/countries/FR/departments")).status).toBe(404);
  });

  it("validates the bucket count", async () => {
    expect((await app.request("/api/insights/countries/IN/distribution?buckets=1")).status).toBe(
      400,
    );
    expect((await app.request("/api/insights/countries/IN/distribution?buckets=8")).status).toBe(
      200,
    );
  });

  it("serves filter options", async () => {
    const res = await app.request("/api/meta/filters");
    expect(res.status).toBe(200);
  });
});
