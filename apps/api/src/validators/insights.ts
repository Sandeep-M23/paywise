import { z } from "zod";
import { fairnessQuerySchema, raiseCostRequestSchema } from "@paywise/shared";
import { validateBody, validateQuery } from "./validate";

export const distributionQuery = z.object({
  buckets: z.coerce.number().int().min(2).max(50).default(10),
});

export type DistributionQuery = z.infer<typeof distributionQuery>;

export const validateDistributionQuery = validateQuery(distributionQuery);
export const validateFairnessQuery = validateQuery(fairnessQuerySchema);
export const validateRaiseCostBody = validateBody(raiseCostRequestSchema);
