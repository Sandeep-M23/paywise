import { Hono, type Context } from "hono";
import { z } from "zod";
import { findCountry, type CountryCode } from "@paywise/shared";
import type { InsightsService } from "../services/insights";
import { notFound } from "../lib/errors";
import { parseQuery } from "../lib/validate";

const distributionQuery = z.object({
  buckets: z.coerce.number().int().min(2).max(50).default(10),
});

function countryParam(c: Context): CountryCode {
  const country = findCountry(c.req.param("code") ?? "");
  if (!country) throw notFound("Country");
  return country.code;
}

export function insightRoutes(service: InsightsService) {
  return new Hono()
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
