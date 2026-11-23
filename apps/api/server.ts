import type { Express } from "express";
import { createApp } from "./src/app";
import { authConfigFromEnv } from "./src/config/auth";
import { createDb, dbConfigFromEnv } from "./src/config/db";
import { systemClock } from "./src/utils/helpers/clock";

const { db } = createDb(dbConfigFromEnv());

const app: Express = createApp({ db, clock: systemClock, auth: authConfigFromEnv() });

export default app;
