import { createDb, dbConfigFromEnv } from "../config/db";
import { syncSchema } from "../config/sync";

const { db, close } = createDb(dbConfigFromEnv());
await db.sequelize.authenticate();
await syncSchema(db, { alter: true });
await close();
console.log("Schema synced");
