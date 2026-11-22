import createError, { type HttpError } from "http-errors";

export type ErrorDetail = { path: string; message: string };

export type ApiHttpError = HttpError & { code: string; details?: ErrorDetail[] };

export const httpError = (status: number, code: string, message: string, details?: ErrorDetail[]) =>
  createError(status, message, { code, details }) as ApiHttpError;

export const isHttpError = (error: unknown): error is ApiHttpError =>
  createError.isHttpError(error);

export const notFound = (what: string) => httpError(404, "not_found", `${what} not found`);

export const conflict = (code: string, message: string) => httpError(409, code, message);

export const invalid = (path: string, message: string) =>
  httpError(422, "validation_failed", message, [{ path, message }]);

const UNIQUE_VIOLATION = "23505";
const CONSTRAINT_ERRORS: Record<string, () => ApiHttpError> = {
  employees_code_unique: () => conflict("duplicate_employee_code", "Employee code already exists"),
  employees_email_unique: () => conflict("duplicate_email", "Email already belongs to an employee"),
  salary_revisions_one_original_per_date: () =>
    conflict(
      "revision_date_taken",
      "There is already a salary change on that date; record a correction instead",
    ),
  salary_revisions_corrected_once: () =>
    conflict("already_corrected", "That change was already corrected; correct the newest one"),
};
const RETRYABLE = new Set(["40P01", "40001"]);

export function mapDbError(error: unknown): never {
  let current: unknown = error;
  while (current && typeof current === "object") {
    const { code, constraint } = current as { code?: string; constraint?: string };
    if (code === UNIQUE_VIOLATION && constraint && CONSTRAINT_ERRORS[constraint]) {
      throw CONSTRAINT_ERRORS[constraint]();
    }
    if (code && RETRYABLE.has(code)) {
      throw conflict("concurrent_change", "Someone else just changed this; please try again");
    }
    const nested = current as { cause?: unknown; parent?: unknown; original?: unknown };
    current = nested.parent ?? nested.original ?? nested.cause;
  }
  throw error;
}
