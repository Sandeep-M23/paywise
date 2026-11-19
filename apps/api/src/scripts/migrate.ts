import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPgDb } from "../config/db";
import { requireEnv } from "../config/env";

const { db, close } = createPgDb(requireEnv("DATABASE_URL"));
await migrate(db as Parameters<typeof migrate>[0], {
  migrationsFolder: new URL("../../drizzle", import.meta.url).pathname,
});
await close();
console.log("Migrations applied");
