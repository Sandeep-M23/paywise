import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import type { Db } from "./config/db";
import type { AuthConfig } from "./interfaces/middlewares/auth";
import { importBodyParser, MAX_JSON_BODY } from "./middlewares/body-limit";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { createRouter } from "./routes";
import { createEmployeeService } from "./services/employees/employees-service";
import { createExportService } from "./services/exports/exports-service";
import { createFairnessService } from "./services/fairness/fairness-service";
import { createImportService } from "./services/imports/imports-service";
import { createInsightsService } from "./services/insights/insights-service";
import type { Clock } from "./utils/helpers/clock";

export type AppDeps = {
  db: Db;
  clock: Clock;
  /** "disabled" only in tests that exercise other features; production always passes a config. */
  auth: AuthConfig | "disabled";
};

export function createApp({ db, clock, auth }: AppDeps) {
  const app = express();

  // Vercel and most hosts sit behind one proxy; needed for the real client IP.
  if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
  // ?country=IN&country=DE becomes a list; no nested objects (?a[b]=) from qs.
  app.set("query parser", "simple");

  // Method, path, status and time only: never bodies, which can hold salaries.
  if (process.env.NODE_ENV === "local") app.use(morgan("dev"));

  // Bearer tokens, not cookies, so allowing other origins can't be used for CSRF.
  app.use(cors());
  app.use(helmet());

  app.use("/api/imports", importBodyParser);
  app.use(express.json({ limit: MAX_JSON_BODY }));

  app.use(
    "/api",
    createRouter(
      {
        employees: createEmployeeService({ db, clock }),
        insights: createInsightsService({ db }),
        fairness: createFairnessService({ db }),
        imports: createImportService({ db, clock }),
        exports: createExportService({ db }),
      },
      auth,
    ),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
