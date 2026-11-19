import { Router, type RequestHandler } from "express";
import { insightsController } from "../../controllers/insights/insights";
import type { FairnessService } from "../../services/fairness/fairness-service";
import type { InsightsService } from "../../services/insights/insights-service";
import * as insightsValidator from "../../validators/insights";

export function insightRoutes(
  service: InsightsService,
  fairness: FairnessService,
  verifyAccessToken: RequestHandler,
) {
  const router = Router();
  const controller = insightsController(service, fairness);

  router.get(
    "/fairness/outliers",
    verifyAccessToken,
    insightsValidator.validateFairnessQuery,
    controller.outliers,
  );

  router.get(
    "/fairness/gender-gaps",
    verifyAccessToken,
    insightsValidator.validateFairnessQuery,
    controller.genderGaps,
  );

  router.post(
    "/raise-cost",
    verifyAccessToken,
    insightsValidator.validateRaiseCostBody,
    controller.raiseCost,
  );

  router.get("/countries", verifyAccessToken, controller.countries);

  router.get("/countries/:code/job-titles", verifyAccessToken, controller.jobTitles);

  router.get("/countries/:code/departments", verifyAccessToken, controller.departments);

  router.get(
    "/countries/:code/distribution",
    verifyAccessToken,
    insightsValidator.validateDistributionQuery,
    controller.distribution,
  );

  return router;
}
