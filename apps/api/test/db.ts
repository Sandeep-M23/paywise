import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../src/models";
import type { Db } from "../src/config/db";

/**
 * Real Postgres, in-process: same SQL semantics as production (percentile_cont,
 * pg_trgm, row locks) without Docker or network. One instance per test file.
 */
export async function createTestDb() {
  const client = new PGlite({ extensions: { pg_trgm } });
  const pgliteDb = drizzle(client, { schema });
  await migrate(pgliteDb, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  const db = pgliteDb as unknown as Db;

  return {
    db,
    reset: () => db.execute(sql`TRUNCATE salary_revisions, employees, imports CASCADE`),
    close: () => client.close(),
  };
}
