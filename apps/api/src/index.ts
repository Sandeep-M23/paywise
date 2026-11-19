import { createApp } from "./app";
import { createPgDb } from "./config/db";
import { authConfigFromEnv } from "./config/auth";
import { systemClock } from "./utils/helpers/clock";
import { requireEnv } from "./config/env";

// Vercel entry point: Vercel's Hono support serves the default export as a function.
const { db } = createPgDb(requireEnv("DATABASE_URL"));

export default createApp({ db, clock: systemClock, auth: authConfigFromEnv() });
