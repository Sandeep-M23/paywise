import { Router, type RequestHandler } from "express";
import { metaController } from "../../controllers/meta/meta";
import type { InsightsService } from "../../services/insights/insights-service";

export function metaRoutes(service: InsightsService, verifyAccessToken: RequestHandler) {
  const router = Router();
  const controller = metaController(service);

  router.get("/filters", verifyAccessToken, controller.filters);

  return router;
}
