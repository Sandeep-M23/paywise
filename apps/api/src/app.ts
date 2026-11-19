import { Hono } from "hono";
import type { Db } from "./config/db";
import type { AuthConfig } from "./interfaces/middlewares/auth";
import { requireSession } from "./middlewares/auth";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { mountRoutes } from "./routes";
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
  const app = new Hono().basePath("/api");
  app.onError(errorHandler);
  app.notFound(notFoundHandler);
  if (auth !== "disabled") {
    app.use("*", requireSession(auth, ["/api/health", "/api/auth/login"]));
  }

  mountRoutes(
    app,
    {
      employees: createEmployeeService({ db, clock }),
      insights: createInsightsService({ db }),
      fairness: createFairnessService({ db }),
      imports: createImportService({ db, clock }),
      exports: createExportService({ db }),
    },
    auth,
  );
  return app;
}
