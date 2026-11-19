import type { NextFunction, Request, Response } from "express";
import type { ApiErrorBody } from "@paywise/shared";
import { isHttpError } from "../utils/helpers/errors";

const CODES: Record<number, string> = {
  400: "bad_request",
  401: "unauthenticated",
  404: "not_found",
  409: "conflict",
  413: "payload_too_large",
  422: "validation_failed",
};

/** Errors thrown by express.json() itself, before any controller runs. */
const BODY_PARSER_ERRORS: Record<string, { code: string; message: string }> = {
  "entity.parse.failed": { code: "invalid_json", message: "Request body must be valid JSON" },
  "entity.too.large": { code: "payload_too_large", message: "Request body is too large" },
};

export const notFoundHandler = (_req: Request, res: Response) => {
  const body: ApiErrorBody = { error: { code: "not_found", message: "Route not found" } };
  res.status(404).json(body);
};

/**
 * Central error handler: every controller's asyncHandler funnels thrown errors
 * here. Known 4xx errors keep their status, code and message; anything else is a
 * logged 500 whose details never reach the client. Express recognises error
 * middleware by its four arguments, so `_next` stays.
 */
export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (isHttpError(error) && error.expose) {
    const parser = BODY_PARSER_ERRORS[(error as { type?: string }).type ?? ""];
    const body: ApiErrorBody = {
      error: {
        code: parser?.code ?? error.code ?? CODES[error.status] ?? "http_error",
        message: parser?.message ?? error.message,
        details: error.details,
      },
    };
    res.status(error.status).json(body);
    return;
  }
  // Name, message and stack only: the request body and a database error's SQL
  // parameters can hold salaries.
  const {
    controller = "app",
    name,
    message,
    stack,
  } = error as Partial<Error> & {
    controller?: string;
  };
  // Sequelize's stack starts with a bare "Error", so name the error explicitly.
  const frames = stack?.split("\n").slice(1).join("\n") ?? "";
  console.error(
    `Unhandled error in ${controller}: ${name ?? "Error"}: ${message ?? String(error)}\n${frames}`,
  );
  const body: ApiErrorBody = { error: { code: "internal", message: "Something went wrong" } };
  res.status(500).json(body);
};
