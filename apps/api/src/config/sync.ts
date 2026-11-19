import { readFile } from "node:fs/promises";
import type { Db } from "./db";

/**
 * Creates or updates the schema, as in the Outbox services: tables come from the
 * models via sequelize.sync(), then config/schema.sql adds what sync() can't
 * express. config/schema-pre.sql backfills new columns on existing databases first. `alter` changes existing tables to match the models; it can drop a
 * column a model no longer has, so production runs it deliberately, after a
 * backup, and never with `force`.
 */
export async function syncSchema(db: Db, { alter = false }: { alter?: boolean } = {}) {
  const sql = (name: string) => readFile(new URL(`./${name}`, import.meta.url), "utf8");
  // The trigram index in schema.sql needs the extension.
  await db.sequelize.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  // Existing databases: fill in new NOT NULL columns before sync adds the constraint.
  await db.sequelize.query(await sql("schema-pre.sql"));
  await db.sequelize.sync({ alter });
  await db.sequelize.query(await sql("schema.sql"));
}
