import type { Request, Response } from "express";
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

function countryParam(req: Request): CountryCode {
  const country = findCountry(req.params.code ?? "");
  if (!country) throw notFound("Country");
  return country.code;
}

export function insightsController(service: InsightsService, fairness: FairnessService) {
  return {
    outliers: asyncHandler(async (req: Request, res: Response) => {
      res.json(await fairness.outliers(req.query as unknown as FairnessQuery));
    }, "outliers"),

    genderGaps: asyncHandler(async (req: Request, res: Response) => {
      res.json(await fairness.genderGaps(req.query as unknown as FairnessQuery));
    }, "genderGaps"),

    raiseCost: asyncHandler(async (req: Request, res: Response) => {
      const request: RaiseCostRequest = req.body;
      res.json(await fairness.raiseCost(request));
    }, "raiseCost"),

    countries: asyncHandler(async (_req: Request, res: Response) => {
      res.json(await service.countrySummaries());
    }, "countries"),

    jobTitles: asyncHandler(async (req: Request, res: Response) => {
      res.json(await service.jobTitles(countryParam(req)));
    }, "jobTitles"),

    departments: asyncHandler(async (req: Request, res: Response) => {
      res.json(await service.departments(countryParam(req)));
    }, "departments"),

    distribution: asyncHandler(async (req: Request, res: Response) => {
      const { buckets } = req.query as unknown as DistributionQuery;
      res.json(await service.distribution(countryParam(req), buckets));
    }, "distribution"),
  };
}
