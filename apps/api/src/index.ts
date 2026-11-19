import { createApp } from "./app";
import { createDb, dbConfigFromEnv } from "./config/db";
import { authConfigFromEnv } from "./config/auth";
import { systemClock } from "./utils/helpers/clock";

// Vercel entry point: Vercel's Hono support serves the default export as a function.
const { db } = createDb(dbConfigFromEnv());

export default createApp({ db, clock: systemClock, auth: authConfigFromEnv() });
