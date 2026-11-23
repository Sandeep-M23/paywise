import { createDb, dbConfigFromEnv, execute, select } from "../config/db";
import { requireEnv } from "../config/env";

const APP_TABLES = ["employees", "imports", "salary_revisions"];
const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;

const role = process.env.APP_DB_USER ?? "paywise_app";
const password = requireEnv("APP_DB_PASSWORD");
if (!IDENTIFIER.test(role)) throw new Error("APP_DB_USER must be a lowercase identifier");
if (password.length < 24) throw new Error("APP_DB_PASSWORD must be at least 24 characters");

const { db, close } = createDb(dbConfigFromEnv());
const [current] = await select<{ database: string }>(db, "SELECT current_database() AS database");
if (!current) throw new Error("Could not read the current database name");
const { database } = current;
const existing = await select(db, "SELECT 1 FROM pg_roles WHERE rolname = :role", { role });

await execute(
  db,
  `${existing.length ? "ALTER" : "CREATE"} ROLE "${role}"
     LOGIN NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD :password`,
  { password },
);
await execute(db, `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM "${role}"`);
await execute(db, `GRANT CONNECT ON DATABASE "${database.replace(/"/g, '""')}" TO "${role}"`);
await execute(db, `GRANT USAGE ON SCHEMA public TO "${role}"`);
await execute(db, `GRANT SELECT, INSERT, UPDATE ON ${APP_TABLES.join(", ")} TO "${role}"`);
await close();
console.log(`Role ${role}: SELECT, INSERT, UPDATE on ${APP_TABLES.join(", ")}; nothing else`);
