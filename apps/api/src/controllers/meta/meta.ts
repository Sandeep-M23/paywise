import type { Request, Response } from "express";
import type { InsightsService } from "../../services/insights/insights-service";
import { asyncHandler } from "../../utils/helpers/http-response";

export function metaController(service: InsightsService) {
  return {
    filters: asyncHandler(async (_req: Request, res: Response) => {
      res.json(await service.filterOptions());
    }, "filterOptions"),
  };
}
