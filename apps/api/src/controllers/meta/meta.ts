import type { Context } from "hono";
import type { InsightsService } from "../../services/insights/insights-service";

export function metaController(service: InsightsService) {
  return {
    async filters(c: Context) {
      return c.json(await service.filterOptions());
    },
  };
}
