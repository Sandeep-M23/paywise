import type { EmployeeListQuery, RaiseCostRequest, RaiseApplyResult } from "@paywise/shared";
import { execute, select, type Db } from "../../config/db";
import { Employee, SalaryRevision, type EmployeeRow, type SalaryRevisionRow } from "../../models";

// Whitelist: the sort parameter picks one of these, never raw text.
const SORT_COLUMNS = {
  fullName: "full_name",
  employeeCode: "employee_code",
  jobTitle: "job_title",
  department: "department",
  countryCode: "country_code",
  salaryAmount: "salary_amount",
  hireDate: "hire_date",
} satisfies Record<EmployeeListQuery["sort"], string>;

/** Every employee column, aliased to the model's attribute names. */
export const EMPLOYEE_COLUMNS = `id, employee_code AS "employeeCode", full_name AS "fullName", email,
  job_title AS "jobTitle", department, country_code AS "countryCode",
  salary_amount AS "salaryAmount", salary_currency AS "salaryCurrency",
  salary_effective_on AS "salaryEffectiveOn", current_revision_id AS "currentRevisionId", gender,
  employment_type AS "employmentType", hire_date AS "hireDate", status,
  deactivated_at AS "deactivatedAt", deactivation_reason AS "deactivationReason",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

/** A WHERE fragment and its named replacements; values never become SQL text. */
export type Where = { sql: string; replacements: Record<string, unknown> };

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/** The directory's filters as SQL. Within a filter any value matches; filters combine with AND. */
export function employeeFilters(
  query: Pick<EmployeeListQuery, "status" | "country" | "jobTitle" | "department" | "q">,
): Where {
  const conditions: string[] = [];
  const replacements: Record<string, unknown> = {};
  if (query.status !== "all") {
    conditions.push("status = :status");
    replacements.status = query.status;
  }
  if (query.country) {
    conditions.push("country_code IN (:country)");
    replacements.country = query.country;
  }
  if (query.jobTitle) {
    conditions.push("job_title IN (:jobTitle)");
    replacements.jobTitle = query.jobTitle;
  }
  if (query.department) {
    conditions.push("department IN (:department)");
    replacements.department = query.department;
  }
  if (query.q) {
    conditions.push("(full_name ILIKE :q OR email ILIKE :q OR employee_code ILIKE :q)");
    replacements.q = `%${escapeLike(query.q)}%`;
  }
  return { sql: conditions.length ? conditions.join(" AND ") : "TRUE", replacements };
}

export async function listEmployees(db: Db, query: EmployeeListQuery) {
  const where = employeeFilters(query);
  const order = `${SORT_COLUMNS[query.sort]} ${query.order === "asc" ? "ASC" : "DESC"}`;
  const [rows, [totals]] = await Promise.all([
    select<EmployeeRow>(
      db,
      // id as a tie-breaker keeps paging stable when sort values repeat.
      `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE ${where.sql}
       ORDER BY ${order}, id ASC LIMIT :limit OFFSET :offset`,
      {
        ...where.replacements,
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
      },
    ),
    select<{ total: number }>(
      db,
      `SELECT count(*) AS total FROM employees WHERE ${where.sql}`,
      where.replacements,
    ),
  ]);
  return { rows, total: totals?.total ?? 0 };
}

export async function findEmployee(
  db: Db,
  id: string,
  { lock = false } = {},
): Promise<EmployeeRow | undefined> {
  const row = await Employee.findByPk(id, {
    raw: true,
    transaction: db.transaction,
    lock: lock && db.transaction ? db.transaction.LOCK.UPDATE : undefined,
  });
  return (row as EmployeeRow | null) ?? undefined;
}

export async function findEmployeeIdByCode(db: Db, code: string) {
  const row = await Employee.findOne({
    where: { employeeCode: code },
    attributes: ["id"],
    raw: true,
    transaction: db.transaction,
  });
  return row?.id;
}

export async function findEmployeeIdByEmail(db: Db, email: string, excludeId?: string) {
  const [row] = await select<{ id: string }>(
    db,
    `SELECT id FROM employees WHERE lower(email) = :email
     ${excludeId ? "AND id <> :excludeId" : ""} LIMIT 1`,
    { email: email.toLowerCase(), excludeId },
  );
  return row?.id;
}

export type NewEmployee = Omit<
  EmployeeRow,
  "id" | "gender" | "status" | "deactivatedAt" | "deactivationReason" | "createdAt" | "updatedAt"
> &
  Partial<Pick<EmployeeRow, "id" | "gender" | "status" | "deactivatedAt" | "deactivationReason">>;

/** Inserts an employee. The cache columns must point at a revision inserted in the same transaction. */
export async function insertEmployee(db: Db, values: NewEmployee): Promise<EmployeeRow> {
  const created = await Employee.create(
    { deactivatedAt: null, deactivationReason: null, ...values },
    { transaction: db.transaction },
  );
  return created.get({ plain: true });
}

export async function updateEmployee(db: Db, id: string, values: Partial<EmployeeRow>) {
  await Employee.update(values, { where: { id }, transaction: db.transaction });
}

export type NewRevision = Omit<
  SalaryRevisionRow,
  "id" | "createdAt" | "note" | "importId" | "correctsRevisionId" | "cancelledAt"
> & {
  id?: string;
  note?: string | null;
  importId?: string | null;
  correctsRevisionId?: string | null;
};

export async function insertRevision(db: Db, values: NewRevision): Promise<SalaryRevisionRow> {
  const created = await SalaryRevision.create(
    { note: null, importId: null, correctsRevisionId: null, ...values },
    { transaction: db.transaction },
  );
  return created.get({ plain: true });
}

/** A revision as the history shows it: the derived previous amount and its state on `today`. */
export type RevisionWithState = SalaryRevisionRow & {
  previousAmount: number | null;
  state: "historical" | "current" | "scheduled" | "corrected" | "cancelled";
};

/**
 * The employee's history, newest first, each revision with its state on `today` and
 * the amount in force just before its date (derived, so a later correction can't
 * leave it stale). On one date the latest-recorded revision wins; earlier ones on
 * that date were corrected.
 */
export async function listRevisions(
  db: Db,
  employeeId: string,
  today: string,
): Promise<RevisionWithState[]> {
  return select<RevisionWithState>(
    db,
    `WITH live AS (
       SELECT * FROM salary_revisions WHERE employee_id = :employeeId AND cancelled_at IS NULL
     ), current_date_of AS (
       SELECT max(effective_on) AS d FROM live WHERE effective_on <= CAST(:today AS date)
     )
     SELECT r.id, r.employee_id AS "employeeId", r.amount, r.currency,
       r.effective_on AS "effectiveOn", r.reason, r.note, r.import_id AS "importId",
       r.corrects_revision_id AS "correctsRevisionId", r.cancelled_at AS "cancelledAt",
       r.created_by AS "createdBy", r.created_at AS "createdAt",
       (SELECT p.amount FROM live p WHERE p.effective_on < r.effective_on
        ORDER BY p.effective_on DESC, p.created_at DESC LIMIT 1) AS "previousAmount",
       CASE
         WHEN r.cancelled_at IS NOT NULL THEN 'cancelled'
         WHEN EXISTS (SELECT 1 FROM live x WHERE x.effective_on = r.effective_on
                        AND x.created_at > r.created_at) THEN 'corrected'
         WHEN r.effective_on > CAST(:today AS date) THEN 'scheduled'
         WHEN r.effective_on = (SELECT d FROM current_date_of) THEN 'current'
         ELSE 'historical'
       END AS state
     FROM salary_revisions r
     WHERE r.employee_id = :employeeId
     ORDER BY r.effective_on DESC, r.created_at DESC`,
    { employeeId, today },
  );
}

/** One revision of this employee, or undefined. */
export async function findRevision(db: Db, employeeId: string, revisionId: string) {
  const row = await SalaryRevision.findOne({
    where: { id: revisionId, employeeId },
    raw: true,
    transaction: db.transaction,
  });
  return (row as SalaryRevisionRow | null) ?? undefined;
}

/** The last revision on the timeline (any date, scheduled included): what the user should be building on. */
export async function timelineHead(db: Db, employeeId: string) {
  const [row] = await select<{ id: string; amount: number; currency: string }>(
    db,
    `SELECT id, amount, currency FROM salary_revisions
     WHERE employee_id = :employeeId AND cancelled_at IS NULL
     ORDER BY effective_on DESC, created_at DESC LIMIT 1`,
    { employeeId },
  );
  return row;
}

/** The newest live revision on a date (the end of its correction chain), if any. */
export async function latestOnDate(db: Db, employeeId: string, date: string) {
  const [row] = await select<{ id: string }>(
    db,
    `SELECT id FROM salary_revisions
     WHERE employee_id = :employeeId AND effective_on = CAST(:date AS date) AND cancelled_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    { employeeId, date },
  );
  return row?.id;
}

/** The pay in force on the day before `date`, if any. */
export async function inForceBefore(db: Db, employeeId: string, date: string) {
  const [row] = await select<{ amount: number; currency: string }>(
    db,
    `SELECT amount, currency FROM salary_revisions
     WHERE employee_id = :employeeId AND cancelled_at IS NULL AND effective_on < CAST(:date AS date)
     ORDER BY effective_on DESC, created_at DESC LIMIT 1`,
    { employeeId, date },
  );
  return row;
}

/** Earliest change other than the hire (for hire-date corrections). */
export async function earliestChange(db: Db, employeeId: string) {
  const [row] = await select<{ d: string | null }>(
    db,
    `SELECT min(effective_on) AS d FROM salary_revisions
     WHERE employee_id = :employeeId AND reason <> 'hire' AND cancelled_at IS NULL`,
    { employeeId },
  );
  return row?.d ?? null;
}

/** Hire-date corrections move the hire revision (and only it) to the new date. */
export async function moveHireRevision(db: Db, employeeId: string, effectiveOn: string) {
  await SalaryRevision.update(
    { effectiveOn },
    { where: { employeeId, reason: "hire" }, transaction: db.transaction },
  );
}

/** Cancels every live revision on a scheduled date (an original and its corrections). */
export async function cancelOnDate(db: Db, employeeId: string, date: string) {
  await execute(
    db,
    `UPDATE salary_revisions SET cancelled_at = now()
     WHERE employee_id = :employeeId AND effective_on = CAST(:date AS date) AND cancelled_at IS NULL`,
    { employeeId, date },
  );
}

/** Cancels every scheduled (future, non-hire) revision of an employee; returns how many. */
export async function cancelScheduled(db: Db, employeeId: string, today: string) {
  const [row] = await select<{ n: number }>(
    db,
    `WITH c AS (
       UPDATE salary_revisions SET cancelled_at = now()
       WHERE employee_id = :employeeId AND cancelled_at IS NULL AND reason <> 'hire'
         AND effective_on > CAST(:today AS date)
       RETURNING 1)
     SELECT count(*)::int AS n FROM c`,
    { employeeId, today },
  );
  return row?.n ?? 0;
}

/**
 * The revision each employee's cache should hold on `today`: the latest effective
 * on or before today (latest-recorded first on a date), or, for someone hired in
 * the future, their earliest revision.
 */
const CACHE_TARGETS = `
  SELECT DISTINCT ON (r.employee_id) r.employee_id, r.id, r.amount, r.currency, r.effective_on
  FROM salary_revisions r
  WHERE r.cancelled_at IS NULL {{employees}}
  ORDER BY r.employee_id,
    (r.effective_on <= CAST(:today AS date)) DESC,
    CASE WHEN r.effective_on <= CAST(:today AS date) THEN r.effective_on END DESC NULLS LAST,
    r.effective_on ASC,
    r.created_at DESC`;

// Compares every copied field, not just the id: moving the hire date keeps the
// revision's id but changes its date, and the composite FK rejects a stale copy.
const CACHE_IS_STALE = `(e.current_revision_id, e.salary_amount, e.salary_currency, e.salary_effective_on)
  IS DISTINCT FROM (t.id, t.amount, t.currency, t.effective_on)`;

/**
 * Points the cache of the given employees (all, if omitted) at their current
 * revision. Callers hold the row locks. Set-based: one statement however many.
 */
export async function refreshSalaryCache(db: Db, today: string, employeeIds?: string[]) {
  if (employeeIds && employeeIds.length === 0) return 0;
  const [row] = await select<{ n: number }>(
    db,
    `WITH t AS (${CACHE_TARGETS.replace("{{employees}}", employeeIds ? "AND r.employee_id IN (:ids)" : "")}),
     u AS (
       UPDATE employees e SET current_revision_id = t.id, salary_amount = t.amount,
         salary_currency = t.currency, salary_effective_on = t.effective_on, updated_at = now()
       FROM t WHERE e.id = t.employee_id AND ${CACHE_IS_STALE}
       RETURNING 1)
     SELECT count(*)::int AS n FROM u`,
    { today, ids: employeeIds },
  );
  return row?.n ?? 0;
}

/**
 * Employees whose cache is behind (a revision became due, or was corrected), locked
 * in id order. Promotion locks first and updates in a later statement, so it sees
 * anything committed while it waited (SCHEMA_REVIEW F2: a one-statement update
 * could overwrite a correction made at the same moment).
 */
export async function lockStaleCaches(db: Db, today: string) {
  const rows = await select<{ id: string }>(
    db,
    `SELECT e.id FROM employees e
     JOIN (${CACHE_TARGETS.replace("{{employees}}", "")}) t ON t.employee_id = e.id
     WHERE ${CACHE_IS_STALE}
     ORDER BY e.id
     FOR NO KEY UPDATE OF e`,
    { today },
  );
  return rows.map((r) => r.id);
}

/** Employees whose cache isn't their current revision: 0 in a healthy database. */
export async function cacheDrift(db: Db, today: string) {
  const [row] = await select<{ n: number }>(
    db,
    `SELECT count(*)::int AS n FROM employees e
     JOIN (${CACHE_TARGETS.replace("{{employees}}", "")}) t ON t.employee_id = e.id
     WHERE ${CACHE_IS_STALE}`,
    { today },
  );
  return row?.n ?? 0;
}

/** Raise plans may name one value or several; the SQL always takes a list. */
const asList = <T>(value: T | T[] | undefined): T[] | undefined =>
  value === undefined ? undefined : Array.isArray(value) ? value : [value];

type RaisePlanInput = Pick<RaiseCostRequest, "percent" | "country" | "jobTitle" | "department"> & {
  overrides?: RaiseCostRequest["overrides"];
};

/**
 * One row per person a raise plan touches: active, and either in the filtered group
 * (only when the group raise is above 0%) or given an individual raise, which wins.
 * The base is the pay in force the day before `effectiveOn` (so a raise after a
 * scheduled promotion builds on the promotion), or the current pay for a what-if
 * without a date. Each raise is rounded half up to a whole minor unit, like
 * `applyRaise` in packages/shared/src/money.ts. Individual raises arrive as one
 * JSON parameter.
 */
function raisePlanRows(plan: RaisePlanInput, effectiveOn?: string): Where {
  const percent = plan.percent ?? 0;
  const replacements: Record<string, unknown> = {
    percent: String(percent),
    overrides: JSON.stringify(
      (plan.overrides ?? []).map((o) => ({
        employee_id: o.employeeId,
        percent: o.percent ?? null,
        new_amount: o.newAmount ?? null,
      })),
    ),
    planDate: effectiveOn ?? null,
  };
  const group: string[] = [];
  const country = asList(plan.country);
  const jobTitle = asList(plan.jobTitle);
  const department = asList(plan.department);
  if (country) {
    group.push("e.country_code IN (:planCountry)");
    replacements.planCountry = country;
  }
  if (jobTitle) {
    group.push("e.job_title IN (:planJobTitle)");
    replacements.planJobTitle = jobTitle;
  }
  if (department) {
    group.push("e.department IN (:planDepartment)");
    replacements.planDepartment = department;
  }
  const inGroup = percent > 0 ? (group.length ? group.join(" AND ") : "TRUE") : "FALSE";
  const base = effectiveOn
    ? `LEFT JOIN LATERAL (
         SELECT r.amount, r.currency FROM salary_revisions r
         WHERE r.employee_id = e.id AND r.cancelled_at IS NULL
           AND r.effective_on < CAST(:planDate AS date)
         ORDER BY r.effective_on DESC, r.created_at DESC LIMIT 1) b ON TRUE`
    : "LEFT JOIN LATERAL (SELECT NULL::bigint AS amount, NULL::char(3) AS currency) b ON TRUE";
  return {
    sql: `
      SELECT e.id, e.full_name, e.hire_date, e.salary_effective_on,
        COALESCE(b.amount, e.salary_amount) AS salary_amount,
        COALESCE(b.currency, e.salary_currency) AS salary_currency,
        o.employee_id IS NOT NULL AS individual,
        (CASE
          WHEN o.employee_id IS NULL
            THEN COALESCE(b.amount, e.salary_amount)
                 + round(COALESCE(b.amount, e.salary_amount) * CAST(:percent AS numeric) / 100)
          WHEN o.new_amount IS NOT NULL THEN o.new_amount
          ELSE COALESCE(b.amount, e.salary_amount)
               + round(COALESCE(b.amount, e.salary_amount) * o.percent / 100)
        END)::bigint AS new_amount
      FROM employees e
      ${base}
      LEFT JOIN jsonb_to_recordset(CAST(:overrides AS jsonb))
        AS o(employee_id uuid, percent numeric, new_amount bigint)
        ON o.employee_id = e.id
      WHERE e.status = 'active' AND (o.employee_id IS NOT NULL OR ${inGroup})`,
    replacements,
  };
}

/** The what-if: cost of a plan per currency, on current pay. Read-only. */
export async function raisePlanCost(db: Db, plan: RaisePlanInput) {
  const p = raisePlanRows(plan);
  return select<{ currency: string; headcount: number; current_total: string; increase: string }>(
    db,
    `SELECT salary_currency AS currency, count(*) AS headcount,
            sum(salary_amount) AS current_total, sum(new_amount - salary_amount) AS increase
     FROM (${p.sql}) AS p
     GROUP BY salary_currency
     ORDER BY salary_currency`,
    p.replacements,
  );
}

/**
 * Locks every row the plan will change, in id order so two plans (or a plan and
 * an import) over the same people can't deadlock, and so the checks and the
 * write see the same salaries.
 */
export async function lockRaisePlan(db: Db, plan: RaisePlanInput) {
  const p = raisePlanRows(plan);
  await select(
    db,
    `SELECT id FROM employees WHERE id IN (SELECT id FROM (${p.sql}) AS p)
     ORDER BY id FOR NO KEY UPDATE`,
    p.replacements,
  );
}

/** People in the plan the rules reject, by rule (counted in SQL, a few names for the message). */
export async function raisePlanProblems(db: Db, plan: RaisePlanInput, effectiveOn: string) {
  const p = raisePlanRows(plan, effectiveOn);
  const [row] = await select<{
    not_active: number;
    not_raised: string[] | null;
    too_early: string[] | null;
    date_taken: string[] | null;
  }>(
    db,
    `WITH p AS (${p.sql})
     SELECT
       (SELECT count(*) FROM jsonb_to_recordset(CAST(:overrides AS jsonb)) AS o(employee_id uuid)
         WHERE NOT EXISTS (SELECT 1 FROM employees x
           WHERE x.id = o.employee_id AND x.status = 'active')) AS not_active,
       (SELECT array_agg(full_name ORDER BY full_name) FROM p
         WHERE individual AND new_amount <= salary_amount) AS not_raised,
       (SELECT array_agg(full_name ORDER BY full_name) FROM p
         -- Not before the hire date, nor before the current revision (that would
         -- rewrite pay already made). For a future hire both are the hire date.
         WHERE CAST(:effectiveOn AS date) < hire_date
            OR CAST(:effectiveOn AS date) < salary_effective_on) AS too_early,
       (SELECT array_agg(full_name ORDER BY full_name) FROM p
         WHERE EXISTS (SELECT 1 FROM salary_revisions r
           WHERE r.employee_id = p.id AND r.effective_on = CAST(:effectiveOn AS date)
             AND r.cancelled_at IS NULL)) AS date_taken`,
    { ...p.replacements, effectiveOn },
  );
  return {
    notActive: Number(row?.not_active ?? 0),
    notRaised: row?.not_raised ?? [],
    tooEarly: row?.too_early ?? [],
    dateTaken: row?.date_taken ?? [],
  };
}

/**
 * Writes the plan in one statement: a revision per changed person (scheduled if
 * the date is in the future). People whose raise rounds to nothing are skipped.
 * Returns the ids written, so the caller can refresh their caches.
 */
export async function applyRaisePlan(
  db: Db,
  plan: RaisePlanInput,
  revision: { effectiveOn: string; reason: string; note: string | null; createdBy: string },
): Promise<Omit<RaiseApplyResult, "scheduled"> & { employeeIds: string[] }> {
  const p = raisePlanRows(plan, revision.effectiveOn);
  const [row] = await select<{ applied: number; skipped: number; ids: string[] | null }>(
    db,
    `WITH p AS (${p.sql}),
     changed AS (SELECT * FROM p WHERE new_amount <> salary_amount),
     inserted AS (
       INSERT INTO salary_revisions
         (employee_id, amount, currency, effective_on, reason, note, created_by)
       SELECT id, new_amount, salary_currency, CAST(:effectiveOn AS date), :reason, :note, :createdBy
       FROM changed
       RETURNING employee_id
     )
     SELECT (SELECT count(*) FROM inserted)::int AS applied,
            ((SELECT count(*) FROM p) - (SELECT count(*) FROM changed))::int AS skipped,
            (SELECT array_agg(employee_id) FROM inserted) AS ids`,
    { ...p.replacements, ...revision },
  );
  return {
    applied: Number(row?.applied ?? 0),
    skipped: Number(row?.skipped ?? 0),
    employeeIds: row?.ids ?? [],
  };
}
