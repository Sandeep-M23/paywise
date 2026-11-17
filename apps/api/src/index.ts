import { createApp } from "./app";
import { createPgDb } from "./db/client";
import { authConfigFromEnv } from "./config";
import { systemClock } from "./lib/clock";
import { requireEnv } from "./lib/env";

// Vercel entry point: Vercel's Hono support serves the default export as a function.
const { db } = createPgDb(requireEnv("DATABASE_URL"));

export default createApp({ db, clock: systemClock, auth: authConfigFromEnv() });
