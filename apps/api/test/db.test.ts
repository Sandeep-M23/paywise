import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { select } from "../src/config/db";
import { createTestDb } from "./db";

describe("test database", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => {
    testDb = await createTestDb();
  });
  afterAll(() => testDb.close());

  it("creates the schema from the models plus schema.sql, including pg_trgm", async () => {
    const [row] = await select(testDb.db, "SELECT similarity('priya', 'priyaa') > 0.5 AS ok");
    expect(row).toEqual({ ok: true });
  });

  it("returns money (bigint) as exact numbers and dates as YYYY-MM-DD strings", async () => {
    const [row] = await select<{ amount: unknown; day: unknown }>(
      testDb.db,
      "SELECT CAST(9007199254 AS bigint) * 1000 AS amount, DATE '2026-04-01' AS day",
    );
    expect(row).toEqual({ amount: 9_007_199_254_000, day: "2026-04-01" });
  });
});
