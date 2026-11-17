import { Hono, type Context } from "hono";
import { z } from "zod";
import {
  fairnessQuerySchema,
  findCountry,
  raiseCostRequestSchema,
  type CountryCode,
} from "@paywise/shared";
import type { FairnessService } from "../services/fairness";
import type { InsightsService } from "../services/insights";
import { notFound } from "../lib/errors";
import { parseBody, parseQuery } from "../lib/validate";

const distributionQuery = z.object({
  buckets: z.coerce.number().int().min(2).max(50).default(10),
});

function countryParam(c: Context): CountryCode {
  const country = findCountry(c.req.param("code") ?? "");
  if (!country) throw notFound("Country");
  return country.code;
}

export function insightRoutes(service: InsightsService, fairness: FairnessService) {
  return new Hono()
    .get("/fairness/outliers", async (c) =>
      c.json(await fairness.outliers(parseQuery(c, fairnessQuerySchema))),
    )
    .get("/fairness/gender-gaps", async (c) =>
      c.json(await fairness.genderGaps(parseQuery(c, fairnessQuerySchema))),
    )
    .post("/raise-cost", async (c) =>
      c.json(await fairness.raiseCost(await parseBody(c, raiseCostRequestSchema))),
    )
    .get("/countries", async (c) => c.json(await service.countrySummaries()))
    .get("/countries/:code/job-titles", async (c) =>
      c.json(await service.jobTitles(countryParam(c))),
    )
    .get("/countries/:code/departments", async (c) =>
      c.json(await service.departments(countryParam(c))),
    )
    .get("/countries/:code/distribution", async (c) => {
      const { buckets } = parseQuery(c, distributionQuery);
      return c.json(await service.distribution(countryParam(c), buckets));
    });
}

export function metaRoutes(service: InsightsService) {
  return new Hono().get("/filters", async (c) => c.json(await service.filterOptions()));
}
