import { createApp } from "./app";
import { createDb, dbConfigFromEnv } from "./config/db";
import { syncSchema } from "./config/sync";
import { systemClock } from "./utils/helpers/clock";
import { authConfigFromEnv } from "./config/auth";

const { db } = createDb(dbConfigFromEnv());

// As in the Outbox services: only a local database is synced on boot. Elsewhere
// the schema changes only through `npm run db:sync`.
if (process.env.NODE_ENV === "local") await syncSchema(db, { alter: true });
const port = Number(process.env.PORT ?? 4000);

createApp({ db, clock: systemClock, auth: authConfigFromEnv() }).listen(port, () =>
  console.log(`API on http://localhost:${port}/api`),
);
