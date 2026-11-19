import type { ErrorHandler, NotFoundHandler } from "hono";
import type { ApiErrorBody } from "@paywise/shared";
import { AppError } from "../utils/helpers/errors";

/** Known errors keep their status and code; anything else is a logged 500. */
export const errorHandler: ErrorHandler = (error, c) => {
  if (error instanceof AppError) {
    const body: ApiErrorBody = {
      error: { code: error.code, message: error.message, details: error.details },
    };
    return c.json(body, error.status);
  }
  console.error(error);
  const body: ApiErrorBody = { error: { code: "internal", message: "Something went wrong" } };
  return c.json(body, 500);
};

export const notFoundHandler: NotFoundHandler = (c) =>
  c.json<ApiErrorBody>({ error: { code: "not_found", message: "Route not found" } }, 404);
