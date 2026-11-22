import type { Response } from "express";
import {
  findCountry,
  type CountryCode,
  type FairnessQuery,
  type RaiseCostRequest,
} from "@paywise/shared";
import type { FairnessService } from "../../services/fairness/fairness-service";
import type { InsightsService } from "../../services/insights/insights-service";
import { notFound } from "../../utils/helpers/errors";
import { asyncHandler } from "../../utils/helpers/http-response";
import type { DistributionQuery } from "../../validators/insights";
import type { ValidatedRequest } from "../../interfaces/helpers/http-response";

type ByCountry = { code: string };

function countryParam(req: ValidatedRequest<unknown, unknown, ByCountry>): CountryCode {
  const country = findCountry(req.params.code);
  if (!country) throw notFound("Country");
  return country.code;
}

export function insightsController(service: InsightsService, fairness: FairnessService) {
  return {
    outliers: asyncHandler(async (req: ValidatedRequest<unknown, FairnessQuery>, res: Response) => {
      res.json(await fairness.outliers(req.query));
    }, "outliers"),

    genderGaps: asyncHandler(
      async (req: ValidatedRequest<unknown, FairnessQuery>, res: Response) => {
        res.json(await fairness.genderGaps(req.query));
      },
      "genderGaps",
    ),

    raiseCost: asyncHandler(async (req: ValidatedRequest<RaiseCostRequest>, res: Response) => {
      res.json(await fairness.raiseCost(req.body));
    }, "raiseCost"),

    countries: asyncHandler(async (_req: ValidatedRequest, res: Response) => {
      res.json(await service.countrySummaries());
    }, "countries"),

    jobTitles: asyncHandler(
      async (req: ValidatedRequest<unknown, unknown, ByCountry>, res: Response) => {
        res.json(await service.jobTitles(countryParam(req)));
      },
      "jobTitles",
    ),

    departments: asyncHandler(
      async (req: ValidatedRequest<unknown, unknown, ByCountry>, res: Response) => {
        res.json(await service.departments(countryParam(req)));
      },
      "departments",
    ),

    distribution: asyncHandler(
      async (req: ValidatedRequest<unknown, DistributionQuery, ByCountry>, res: Response) => {
        const { buckets } = req.query;
        res.json(await service.distribution(countryParam(req), buckets));
      },
      "distribution",
    ),
  };
}
