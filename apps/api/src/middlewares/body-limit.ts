import express, { type NextFunction, type Request, type Response } from "express";
import { httpError } from "../utils/helpers/errors";

// Vercel Functions reject request bodies over 4.5 MB; fail early with a clear message.
export const MAX_IMPORT_BODY_BYTES = 4_400_000;
// Everything except an import is a small form or filter.
export const MAX_JSON_BODY = "1mb";

const importJson = express.json({ limit: MAX_IMPORT_BODY_BYTES });

/**
 * Parses an import's larger body. Mounted before the app-wide express.json(),
 * which then skips the already-parsed request.
 */
export const importBodyParser = (req: Request, res: Response, next: NextFunction) =>
  importJson(req, res, (error?: unknown) => {
    if ((error as { type?: string } | undefined)?.type === "entity.too.large") {
      return next(
        httpError(413, "import_too_large", "File is too large; split it into smaller files"),
      );
    }
    return next(error);
  });
