import { readFile } from "node:fs/promises";
import type { Db } from "./db";

export async function syncSchema(db: Db, { alter = false }: { alter?: boolean } = {}) {
  const sql = (name: string) => readFile(new URL(`./${name}`, import.meta.url), "utf8");
  await db.sequelize.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  await db.sequelize.query(await sql("schema-pre.sql"));
  await db.sequelize.sync({ alter });
  await db.sequelize.query(await sql("schema.sql"));
}
