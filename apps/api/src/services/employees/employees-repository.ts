import type { EmployeeListQuery, RaiseCostRequest, RaiseApplyResult } from "@paywise/shared";
import { select, type Db } from "../../config/db";
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
  salary_amount AS "salaryAmount", salary_currency AS "salaryCurrency", gender,
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

export async function listRevisions(db: Db, employeeId: string): Promise<SalaryRevisionRow[]> {
  return SalaryRevision.findAll({
    where: { employeeId },
    order: [
      ["effectiveOn", "DESC"],
      ["createdAt", "DESC"],
    ],
    raw: true,
    transaction: db.transaction,
  }) as unknown as Promise<SalaryRevisionRow[]>;
}

export type NewRevision = Omit<SalaryRevisionRow, "id" | "createdAt" | "note" | "importId"> & {
  note?: string | null;
  importId?: string | null;
};

export async function insertRevision(db: Db, values: NewRevision) {
  await SalaryRevision.create(
    { note: null, importId: null, ...values },
    { transaction: db.transaction },
  );
}

/** Latest effective date overall, and earliest one excluding the hire revision. */
export async function revisionDateBounds(db: Db, employeeId: string) {
  const [row] = await select<{ latest: string | null; earliest_change: string | null }>(
    db,
    `SELECT max(effective_on) AS latest,
            min(effective_on) FILTER (WHERE reason <> 'hire') AS earliest_change
     FROM salary_revisions WHERE employee_id = :employeeId`,
    { employeeId },
  );
  return { latest: row?.latest ?? null, earliestChange: row?.earliest_change ?? null };
}

export async function moveHireRevision(db: Db, employeeId: string, effectiveOn: string) {
  await SalaryRevision.update(
    { effectiveOn },
    { where: { employeeId, reason: "hire" }, transaction: db.transaction },
  );
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
 * Each raise is rounded half up to a whole minor unit, like `applyRaise` in
 * packages/shared/src/money.ts. Individual raises arrive as one JSON parameter.
 */
function raisePlanRows(plan: RaisePlanInput): Where {
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
  return {
    sql: `
      SELECT e.id, e.full_name, e.salary_amount, e.salary_currency, e.hire_date,
        o.employee_id IS NOT NULL AS individual,
        (CASE
          WHEN o.employee_id IS NULL
            THEN e.salary_amount + round(e.salary_amount * CAST(:percent AS numeric) / 100)
          WHEN o.new_amount IS NOT NULL THEN o.new_amount
          ELSE e.salary_amount + round(e.salary_amount * o.percent / 100)
        END)::bigint AS new_amount
      FROM employees e
      LEFT JOIN jsonb_to_recordset(CAST(:overrides AS jsonb))
        AS o(employee_id uuid, percent numeric, new_amount bigint)
        ON o.employee_id = e.id
      WHERE e.status = 'active' AND (o.employee_id IS NOT NULL OR ${inGroup})`,
    replacements,
  };
}

/** The what-if: cost of a plan per currency. Read-only. */
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
 * Locks every row the plan will change, in id order so two plans over the same
 * people can't deadlock, and so the checks and the write see the same salaries.
 */
export async function lockRaisePlan(db: Db, plan: RaisePlanInput) {
  const p = raisePlanRows(plan);
  await select(
    db,
    `SELECT id FROM employees WHERE id IN (SELECT id FROM (${p.sql}) AS p)
     ORDER BY id FOR UPDATE`,
    p.replacements,
  );
}

/** People in the plan the rules reject, by rule (counted in SQL, a few names for the message). */
export async function raisePlanProblems(db: Db, plan: RaisePlanInput, effectiveOn: string) {
  const p = raisePlanRows(plan);
  const [row] = await select<{
    not_active: number;
    not_raised: string[] | null;
    too_early: string[] | null;
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
         WHERE CAST(:effectiveOn AS date) < hire_date
            OR CAST(:effectiveOn AS date) < (SELECT max(r.effective_on) FROM salary_revisions r
                                             WHERE r.employee_id = p.id)) AS too_early`,
    { ...p.replacements, effectiveOn },
  );
  return {
    notActive: Number(row?.not_active ?? 0),
    notRaised: row?.not_raised ?? [],
    tooEarly: row?.too_early ?? [],
  };
}

/**
 * Writes the plan in one statement: a revision per changed person and their new
 * current salary. People whose raise rounds to nothing are skipped.
 */
export async function applyRaisePlan(
  db: Db,
  plan: RaisePlanInput,
  revision: { effectiveOn: string; reason: string; note: string | null },
): Promise<RaiseApplyResult> {
  const p = raisePlanRows(plan);
  const [row] = await select<{ applied: number; skipped: number }>(
    db,
    `WITH p AS (${p.sql}),
     changed AS (SELECT * FROM p WHERE new_amount <> salary_amount),
     -- Data-modifying CTEs always run, referenced or not.
     inserted AS (
       INSERT INTO salary_revisions
         (employee_id, amount, previous_amount, currency, effective_on, reason, note)
       SELECT id, new_amount, salary_amount, salary_currency, CAST(:effectiveOn AS date),
              :reason, :note
       FROM changed
       RETURNING 1
     ),
     updated AS (
       UPDATE employees SET salary_amount = changed.new_amount, updated_at = now()
       FROM changed WHERE employees.id = changed.id
       RETURNING 1
     )
     SELECT (SELECT count(*) FROM updated) AS applied,
            (SELECT count(*) FROM p) - (SELECT count(*) FROM changed) AS skipped`,
    { ...p.replacements, ...revision },
  );
  return { applied: Number(row?.applied), skipped: Number(row?.skipped) };
}
