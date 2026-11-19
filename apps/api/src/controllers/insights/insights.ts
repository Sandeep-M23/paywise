import type { Context } from "hono";
import {
  fairnessQuerySchema,
  findCountry,
  raiseCostRequestSchema,
  type CountryCode,
} from "@paywise/shared";
import { notFound } from "../../utils/helpers/errors";
import { distributionQuery } from "../../validators/insights";
import { parseBody, parseQuery } from "../../validators/validate";
import type { FairnessService } from "../../services/fairness/fairness-service";
import type { InsightsService } from "../../services/insights/insights-service";

function countryParam(c: Context): CountryCode {
  const country = findCountry(c.req.param("code") ?? "");
  if (!country) throw notFound("Country");
  return country.code;
}

export function insightsController(service: InsightsService, fairness: FairnessService) {
  return {
    async outliers(c: Context) {
      return c.json(await fairness.outliers(parseQuery(c, fairnessQuerySchema)));
    },

    async genderGaps(c: Context) {
      return c.json(await fairness.genderGaps(parseQuery(c, fairnessQuerySchema)));
    },

    async raiseCost(c: Context) {
      return c.json(await fairness.raiseCost(await parseBody(c, raiseCostRequestSchema)));
    },

    async countries(c: Context) {
      return c.json(await service.countrySummaries());
    },

    async jobTitles(c: Context) {
      return c.json(await service.jobTitles(countryParam(c)));
    },

    async departments(c: Context) {
      return c.json(await service.departments(countryParam(c)));
    },

    async distribution(c: Context) {
      const { buckets } = parseQuery(c, distributionQuery);
      return c.json(await service.distribution(countryParam(c), buckets));
    },
  };
}
