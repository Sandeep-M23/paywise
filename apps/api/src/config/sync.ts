import { readFile } from "node:fs/promises";
import type { Db } from "./db";

/**
 * Creates or updates the schema, as in the Outbox services: tables come from the
 * models via sequelize.sync(), then config/schema.sql adds what sync() can't
 * express. `alter` changes existing tables to match the models; it can drop a
 * column a model no longer has, so production runs it deliberately, after a
 * backup, and never with `force`.
 */
export async function syncSchema(db: Db, { alter = false }: { alter?: boolean } = {}) {
  // The trigram index in schema.sql needs the extension.
  await db.sequelize.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  await db.sequelize.sync({ alter });
  const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  await db.sequelize.query(schema);
}
