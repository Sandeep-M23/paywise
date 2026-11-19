import { z } from "zod";

export const distributionQuery = z.object({
  buckets: z.coerce.number().int().min(2).max(50).default(10),
});
