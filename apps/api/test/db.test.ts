import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "./db";

describe("test database", () => {
  let testDb: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => {
    testDb = await createTestDb();
  });
  afterAll(() => testDb.close());

  it("applies migrations including pg_trgm", async () => {
    const result = await testDb.db.execute(sql`SELECT similarity('priya', 'priyaa') > 0.5 AS ok`);
    expect(result.rows[0]).toEqual({ ok: true });
  });
});
