import type { PgDatabase } from "drizzle-orm/pg-core";
import { drizzle, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../models";

/**
 * Any Drizzle Postgres database (node-postgres in prod, PGlite in tests) or a
 * transaction on one. Repositories and services depend on this, not on a driver.
 */
// Typed with node-postgres results (`{ rows }`), which PGlite results also satisfy.
export type Db = PgDatabase<NodePgQueryResultHKT, typeof schema>;

export function createPgDb(connectionString: string): { db: Db; close: () => Promise<void> } {
  // Small pool: on Vercel each function instance holds its own connections.
  const pool = new pg.Pool({ connectionString, max: 5 });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}

export { schema };
