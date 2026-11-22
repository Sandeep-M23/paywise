import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { httpError } from "../utils/helpers/errors";

function toDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

export const validateBody =
  (schema: z.ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        httpError(422, "validation_failed", "Some fields are invalid", toDetails(result.error)),
      );
    }
    req.body = result.data;
    return next();
  };

export const validateQuery =
  (schema: z.ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(
        httpError(400, "invalid_query", "Invalid query parameters", toDetails(result.error)),
      );
    }
    req.query = result.data as Request["query"];
    return next();
  };
