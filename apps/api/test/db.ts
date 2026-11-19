import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { createDb, execute } from "../src/config/db";
import { syncSchema } from "../src/config/sync";

/**
 * Real Postgres, in-process: same SQL semantics as production (percentile_cont,
 * pg_trgm, row locks) without Docker or network. PGlite is served over a Unix
 * socket in a temp folder so Sequelize connects to it like any server, and test
 * files running in parallel never share a port. PGlite has one connection, so the
 * pool is 1: a query that forgets its transaction would wait forever and fail
 * the test, which keeps transaction handling honest. One instance per test file.
 */
export async function createTestDb() {
  const pglite = new PGlite({ extensions: { pg_trgm } });
  const dir = await mkdtemp(join(tmpdir(), "paywise-pg-"));
  const port = 5432;
  const server = new PGLiteSocketServer({ db: pglite, path: join(dir, `.s.PGSQL.${port}`) });
  await server.start();

  const { db, close } = createDb({
    host: dir,
    port,
    database: "postgres",
    username: "postgres",
    password: "",
    ssl: false,
    poolMax: 1,
  });
  await syncSchema(db);

  return {
    db,
    reset: () => execute(db, "TRUNCATE salary_revisions, employees, imports CASCADE"),
    close: async () => {
      await close();
      await server.stop();
      await pglite.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}
