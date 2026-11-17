import { Hono } from "hono";
import type { ApiErrorBody } from "@paywise/shared";
import type { Db } from "./db/client";
import type { Clock } from "./lib/clock";
import { AppError } from "./lib/errors";
import { createEmployeeService } from "./services/employees";
import { employeeRoutes } from "./routes/employees";
import { createInsightsService } from "./services/insights";
import { createFairnessService } from "./services/fairness";
import { insightRoutes, metaRoutes } from "./routes/insights";
import { createImportService } from "./services/imports";
import { createExportService } from "./services/exports";
import { exportRoutes, importRoutes } from "./routes/imports";

export type AppDeps = { db: Db; clock: Clock };

export function createApp({ db, clock }: AppDeps) {
  const employees = createEmployeeService({ db, clock });
  const insights = createInsightsService({ db });
  const fairness = createFairnessService({ db });
  const imports = createImportService({ db, clock });
  const exports = createExportService({ db });

  const app = new Hono().basePath("/api");

  app.onError((error, c) => {
    if (error instanceof AppError) {
      const body: ApiErrorBody = {
        error: { code: error.code, message: error.message, details: error.details },
      };
      return c.json(body, error.status);
    }
    console.error(error);
    const body: ApiErrorBody = { error: { code: "internal", message: "Something went wrong" } };
    return c.json(body, 500);
  });

  app.notFound((c) =>
    c.json<ApiErrorBody>({ error: { code: "not_found", message: "Route not found" } }, 404),
  );

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/employees", employeeRoutes(employees));
  app.route("/insights", insightRoutes(insights, fairness));
  app.route("/meta", metaRoutes(insights));
  app.route("/imports", importRoutes(imports, exports));
  app.route("/export", exportRoutes(exports));

  return app;
}
