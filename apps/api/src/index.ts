import { createApp } from "./app";
import { createDb, dbConfigFromEnv } from "./config/db";
import { authConfigFromEnv } from "./config/auth";
import { systemClock } from "./utils/helpers/clock";

const { db } = createDb(dbConfigFromEnv());

export default createApp({ db, clock: systemClock, auth: authConfigFromEnv() });
