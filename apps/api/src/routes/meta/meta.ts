import { Hono } from "hono";
import { metaController } from "../../controllers/meta/meta";
import type { InsightsService } from "../../services/insights/insights-service";

export function metaRoutes(service: InsightsService) {
  const controller = metaController(service);
  return new Hono().get("/filters", controller.filters);
}
