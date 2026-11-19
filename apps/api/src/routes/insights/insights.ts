import { Hono } from "hono";
import { insightsController } from "../../controllers/insights/insights";
import type { FairnessService } from "../../services/fairness/fairness-service";
import type { InsightsService } from "../../services/insights/insights-service";

export function insightRoutes(service: InsightsService, fairness: FairnessService) {
  const controller = insightsController(service, fairness);
  return new Hono()
    .get("/fairness/outliers", controller.outliers)
    .get("/fairness/gender-gaps", controller.genderGaps)
    .post("/raise-cost", controller.raiseCost)
    .get("/countries", controller.countries)
    .get("/countries/:code/job-titles", controller.jobTitles)
    .get("/countries/:code/departments", controller.departments)
    .get("/countries/:code/distribution", controller.distribution);
}
