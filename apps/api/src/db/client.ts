import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

/**
 * Any Drizzle Postgres database (node-postgres in prod, PGlite in tests) or a
 * transaction on one. Repositories and services depend on this, not on a driver.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export function createPgDb(connectionString: string): { db: Db; close: () => Promise<void> } {
  // Small pool: on Vercel each function instance holds its own connections.
  const pool = new pg.Pool({ connectionString, max: 5 });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}

export { schema };
