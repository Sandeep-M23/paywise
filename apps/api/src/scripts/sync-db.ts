import { createDb, dbConfigFromEnv } from "../config/db";
import { syncSchema } from "../config/sync";

// `npm run db:sync`: create or update the tables from the models, then apply
// config/schema.sql. Run deliberately (after a backup in production), never on boot.
const { db, close } = createDb(dbConfigFromEnv());
await db.sequelize.authenticate();
await syncSchema(db, { alter: true });
await close();
console.log("Schema synced");
