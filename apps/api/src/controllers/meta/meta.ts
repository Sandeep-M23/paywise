import type { Response } from "express";
import type { ValidatedRequest } from "../../interfaces/helpers/http-response";
import type { InsightsService } from "../../services/insights/insights-service";
import { asyncHandler } from "../../utils/helpers/http-response";

export function metaController(service: InsightsService) {
  return {
    filters: asyncHandler(async (_req: ValidatedRequest, res: Response) => {
      res.json(await service.filterOptions());
    }, "filterOptions"),
  };
}
