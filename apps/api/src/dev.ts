import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createPgDb } from "./config/db";
import { systemClock } from "./utils/helpers/clock";
import { requireEnv } from "./config/env";
import { authConfigFromEnv } from "./config/auth";

const { db } = createPgDb(requireEnv("DATABASE_URL"));
const port = Number(process.env.PORT ?? 4000);

serve({ fetch: createApp({ db, clock: systemClock, auth: authConfigFromEnv() }).fetch, port }, () =>
  console.log(`API on http://localhost:${port}/api`),
);
