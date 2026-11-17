import type { Context } from "hono";
import type { z } from "zod";
import { AppError } from "./errors";

function toDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

/** Validates a JSON body. Malformed JSON is a 400; well-formed but invalid data is a 422. */
export async function parseBody<T extends z.ZodType>(c: Context, schema: T): Promise<z.output<T>> {
  const json: unknown = await c.req.json().catch(() => {
    throw new AppError(400, "invalid_json", "Request body must be valid JSON");
  });
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new AppError(
      422,
      "validation_failed",
      "Some fields are invalid",
      toDetails(result.error),
    );
  }
  return result.data;
}

/** Validates query-string parameters; failures are a 400 (the request itself is malformed). */
export function parseQuery<T extends z.ZodType>(c: Context, schema: T): z.output<T> {
  const result = schema.safeParse(c.req.query());
  if (!result.success) {
    throw new AppError(400, "invalid_query", "Invalid query parameters", toDetails(result.error));
  }
  return result.data;
}
