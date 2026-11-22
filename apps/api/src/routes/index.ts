import { Router } from "express";
import type { AuthConfig } from "../interfaces/middlewares/auth";
import type { Services } from "../interfaces/services";
import { skipAuth, verifyAccessToken } from "../middlewares/auth";
import { createAuthService } from "../services/auth/auth-service";
import { authRoutes } from "./auth/auth";
import { employeeRoutes } from "./employees/employees";
import { exportRoutes } from "./exports/exports";
import { healthRoutes } from "./health/health";
import { importRoutes } from "./imports/imports";
import { insightRoutes } from "./insights/insights";
import { metaRoutes } from "./meta/meta";

export function createRouter(services: Services, auth: AuthConfig | "disabled") {
  const router = Router();
  const verify = auth === "disabled" ? skipAuth : verifyAccessToken(auth);

  if (auth !== "disabled") router.use("/auth", authRoutes(createAuthService(auth), verify));

  router.use("/health", healthRoutes());
  router.use("/employees", employeeRoutes(services.employees, verify));
  router.use("/insights", insightRoutes(services.insights, services.fairness, verify));
  router.use("/meta", metaRoutes(services.insights, verify));
  router.use("/imports", importRoutes(services.imports, services.exports, verify));
  router.use("/export", exportRoutes(services.exports, verify));

  return router;
}
