import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateEmployees } from "../src/scripts/seed/generate";
import { seedDatabase } from "../src/scripts/seed/seed";
import { select } from "../src/config/db";
import { createTestDb } from "./db";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
const people = generateEmployees({ count: 1_500, seed: 1, today: "2026-06-30" });

beforeAll(async () => {
  testDb = await createTestDb();
  await seedDatabase(testDb.db, people);
});
afterAll(() => testDb.close());

const one = async (query: string) => (await select(testDb.db, query))[0];

describe("seedDatabase", () => {
  it("inserts every employee and revision across batches", async () => {
    expect(await one(`SELECT count(*)::int AS n FROM employees`)).toEqual({ n: 1_500 });
    const revisions = people.reduce((sum, p) => sum + p.history.length, 0);
    expect(await one(`SELECT count(*)::int AS n FROM salary_revisions`)).toEqual({
      n: revisions,
    });
  });

  it("keeps each employee's current salary equal to their latest revision", async () => {
    const mismatches = await one(`
      SELECT count(*)::int AS n FROM employees e
      WHERE e.salary_amount <> (
        SELECT r.amount FROM salary_revisions r WHERE r.employee_id = e.id
        ORDER BY r.effective_on DESC, r.amount DESC LIMIT 1)`);
    expect(mismatches).toEqual({ n: 0 });
  });

  it("points each employee's cache at their latest revision", async () => {
    const stale = await one(`
      SELECT count(*)::int AS n FROM employees e
      WHERE e.current_revision_id IS DISTINCT FROM (
        SELECT r.id FROM salary_revisions r WHERE r.employee_id = e.id
        ORDER BY r.effective_on DESC LIMIT 1)`);
    expect(stale).toEqual({ n: 0 });
  });

  it("is repeatable: seeding again replaces rather than duplicates", async () => {
    await seedDatabase(testDb.db, people.slice(0, 10));
    expect(await one(`SELECT count(*)::int AS n FROM employees`)).toEqual({ n: 10 });
  });
});
