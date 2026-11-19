import type { Hono } from "hono";
import type { AuthConfig } from "../interfaces/middlewares/auth";
import type { Services } from "../interfaces/services";
import { authRoutes } from "./auth/auth";
import { employeeRoutes } from "./employees/employees";
import { exportRoutes } from "./exports/exports";
import { importRoutes } from "./imports/imports";
import { insightRoutes } from "./insights/insights";
import { metaRoutes } from "./meta/meta";

/** Every feature's routes, mounted under /api. Auth routes only exist when auth is on. */
export function mountRoutes(app: Hono, services: Services, auth: AuthConfig | "disabled") {
  if (auth !== "disabled") app.route("/auth", authRoutes(auth));

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/employees", employeeRoutes(services.employees));
  app.route("/insights", insightRoutes(services.insights, services.fairness));
  app.route("/meta", metaRoutes(services.insights));
  app.route("/imports", importRoutes(services.imports, services.exports));
  app.route("/export", exportRoutes(services.exports));
}
