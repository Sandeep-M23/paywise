import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createPgDb } from "./db/client";
import { systemClock } from "./lib/clock";
import { requireEnv } from "./lib/env";
import { authConfigFromEnv } from "./config";

const { db } = createPgDb(requireEnv("DATABASE_URL"));
const port = Number(process.env.PORT ?? 4000);

serve({ fetch: createApp({ db, clock: systemClock, auth: authConfigFromEnv() }).fetch, port }, () =>
  console.log(`API on http://localhost:${port}/api`),
);
