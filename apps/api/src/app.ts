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
  auth: AuthConfig | "disabled";
};

export function createApp({ db, clock, auth }: AppDeps) {
  const app = express();

  if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
  app.set("query parser", "simple");

  if (process.env.NODE_ENV === "local") app.use(morgan("dev"));

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
