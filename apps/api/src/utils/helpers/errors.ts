export type ErrorDetail = { path: string; message: string };

/** An expected failure that maps directly to an HTTP response. */
export class AppError extends Error {
  constructor(
    readonly status: 400 | 401 | 404 | 409 | 413 | 422,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what: string) => new AppError(404, "not_found", `${what} not found`);

export const conflict = (code: string, message: string) => new AppError(409, code, message);

export const invalid = (path: string, message: string) =>
  new AppError(422, "validation_failed", message, [{ path, message }]);

const UNIQUE_VIOLATION = "23505";
const CONSTRAINT_ERRORS: Record<string, () => AppError> = {
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
// A deadlock or serialization failure: the other transaction won; retrying succeeds.
const RETRYABLE = new Set(["40P01", "40001"]);

/**
 * Turns unique-constraint violations and lost races (deadlock, serialization) into
 * 409s. The services check first for friendly errors; this covers the race between
 * check and write.
 */
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
    // Drivers nest the Postgres error: `cause` (pg), `parent`/`original` (Sequelize).
    const nested = current as { cause?: unknown; parent?: unknown; original?: unknown };
    current = nested.parent ?? nested.original ?? nested.cause;
  }
  throw error;
}
