import express, { type NextFunction, type Request, type Response } from "express";
import { httpError } from "../utils/helpers/errors";

export const MAX_IMPORT_BODY_BYTES = 4_400_000;
export const MAX_JSON_BODY = "1mb";

const importJson = express.json({ limit: MAX_IMPORT_BODY_BYTES });

export const importBodyParser = (req: Request, res: Response, next: NextFunction) =>
  importJson(req, res, (error?: unknown) => {
    if ((error as { type?: string } | undefined)?.type === "entity.too.large") {
      return next(
        httpError(413, "import_too_large", "File is too large; split it into smaller files"),
      );
    }
    return next(error);
  });
