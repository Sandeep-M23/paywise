import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  max,
  min,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { EmployeeListQuery, RaiseCostRequest, RaiseApplyResult } from "@paywise/shared";
import type { Db } from "../db/client";
import { employees, salaryRevisions, type NewEmployeeRow } from "../db/schema";

const SORT_COLUMNS = {
  fullName: employees.fullName,
  employeeCode: employees.employeeCode,
  jobTitle: employees.jobTitle,
  department: employees.department,
  countryCode: employees.countryCode,
  salaryAmount: employees.salaryAmount,
  hireDate: employees.hireDate,
} satisfies Record<EmployeeListQuery["sort"], unknown>;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

export function employeeFilters(
  query: Pick<EmployeeListQuery, "status" | "country" | "jobTitle" | "department" | "q">,
): SQL | undefined {
  const conditions: (SQL | undefined)[] = [
    query.status === "all" ? undefined : eq(employees.status, query.status),
    query.country ? inArray(employees.countryCode, query.country) : undefined,
    query.jobTitle ? inArray(employees.jobTitle, query.jobTitle) : undefined,
    query.department ? inArray(employees.department, query.department) : undefined,
  ];
  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    conditions.push(
      or(
        ilike(employees.fullName, pattern),
        ilike(employees.email, pattern),
        ilike(employees.employeeCode, pattern),
      ),
    );
  }
  return and(...conditions);
}

export async function listEmployees(db: Db, query: EmployeeListQuery) {
  const where = employeeFilters(query);
  const direction = query.order === "asc" ? asc : desc;
  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(employees)
      .where(where)
      // id as a tie-breaker keeps paging stable when sort values repeat.
      .orderBy(direction(SORT_COLUMNS[query.sort]), asc(employees.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ total: count() }).from(employees).where(where),
  ]);
  return { rows, total: totals?.total ?? 0 };
}

export async function findEmployee(db: Db, id: string, { lock = false } = {}) {
  const query = db.select().from(employees).where(eq(employees.id, id));
  const [row] = lock ? await query.for("update") : await query;
  return row;
}

export async function findEmployeeIdByCode(db: Db, code: string) {
  const [row] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.employeeCode, code));
  return row?.id;
}

export async function findEmployeeIdByEmail(db: Db, email: string, excludeId?: string) {
  const [row] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      and(
        eq(sql`lower(${employees.email})`, email.toLowerCase()),
        excludeId ? ne(employees.id, excludeId) : undefined,
      ),
    );
  return row?.id;
}

export async function insertEmployee(db: Db, values: NewEmployeeRow) {
  const [row] = await db.insert(employees).values(values).returning();
  return row!;
}

export async function updateEmployee(db: Db, id: string, values: Partial<NewEmployeeRow>) {
  await db.update(employees).set(values).where(eq(employees.id, id));
}

export async function listRevisions(db: Db, employeeId: string) {
  return db
    .select()
    .from(salaryRevisions)
    .where(eq(salaryRevisions.employeeId, employeeId))
    .orderBy(desc(salaryRevisions.effectiveOn), desc(salaryRevisions.createdAt));
}

export async function insertRevision(db: Db, values: typeof salaryRevisions.$inferInsert) {
  await db.insert(salaryRevisions).values(values);
}

/** Latest effective date overall, and earliest one excluding the hire revision. */
export async function revisionDateBounds(db: Db, employeeId: string) {
  const [latest] = await db
    .select({ latest: max(salaryRevisions.effectiveOn) })
    .from(salaryRevisions)
    .where(eq(salaryRevisions.employeeId, employeeId));
  const [earliest] = await db
    .select({ earliestChange: min(salaryRevisions.effectiveOn) })
    .from(salaryRevisions)
    .where(and(eq(salaryRevisions.employeeId, employeeId), ne(salaryRevisions.reason, "hire")));
  return { latest: latest?.latest ?? null, earliestChange: earliest?.earliestChange ?? null };
}

export async function moveHireRevision(db: Db, employeeId: string, effectiveOn: string) {
  await db
    .update(salaryRevisions)
    .set({ effectiveOn })
    .where(and(eq(salaryRevisions.employeeId, employeeId), eq(salaryRevisions.reason, "hire")));
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
function raisePlanRows(plan: RaisePlanInput): SQL {
  const percent = String(plan.percent ?? 0);
  const overrides = JSON.stringify(
    (plan.overrides ?? []).map((o) => ({
      employee_id: o.employeeId,
      percent: o.percent ?? null,
      new_amount: o.newAmount ?? null,
    })),
  );
  const inGroup =
    Number(percent) > 0
      ? (and(
          plan.country ? inArray(employees.countryCode, asList(plan.country)!) : undefined,
          plan.jobTitle ? inArray(employees.jobTitle, asList(plan.jobTitle)!) : undefined,
          plan.department ? inArray(employees.department, asList(plan.department)!) : undefined,
        ) ?? sql`true`)
      : sql`false`;
  return sql`
    SELECT ${employees.id} AS id, ${employees.fullName} AS full_name,
      ${employees.salaryAmount} AS salary_amount, ${employees.salaryCurrency} AS salary_currency,
      ${employees.hireDate} AS hire_date, o.employee_id IS NOT NULL AS individual,
      (CASE
        WHEN o.employee_id IS NULL
          THEN ${employees.salaryAmount} + round(${employees.salaryAmount} * ${percent}::numeric / 100)
        WHEN o.new_amount IS NOT NULL THEN o.new_amount
        ELSE ${employees.salaryAmount} + round(${employees.salaryAmount} * o.percent / 100)
      END)::bigint AS new_amount
    FROM ${employees}
    LEFT JOIN jsonb_to_recordset(${overrides}::jsonb)
      AS o(employee_id uuid, percent numeric, new_amount bigint)
      ON o.employee_id = ${employees.id}
    WHERE ${employees.status} = 'active' AND (o.employee_id IS NOT NULL OR ${inGroup})
  `;
}

/** The what-if: cost of a plan per currency. Read-only. */
export async function raisePlanCost(db: Db, plan: RaisePlanInput) {
  const { rows } = await db.execute(sql`
    SELECT salary_currency AS currency, count(*) AS headcount,
           sum(salary_amount) AS current_total, sum(new_amount - salary_amount) AS increase
    FROM (${raisePlanRows(plan)}) AS p
    GROUP BY salary_currency
    ORDER BY salary_currency
  `);
  return rows;
}

/** Locks every row the plan will change, so the checks and the write see the same salaries. */
export async function lockRaisePlan(db: Db, plan: RaisePlanInput) {
  await db.execute(sql`
    SELECT ${employees.id} FROM ${employees}
    WHERE ${employees.id} IN (SELECT id FROM (${raisePlanRows(plan)}) AS p)
    FOR UPDATE
  `);
}

/** People in the plan the rules reject, by rule (counted in SQL, a few names for the message). */
export async function raisePlanProblems(db: Db, plan: RaisePlanInput, effectiveOn: string) {
  const overrides = JSON.stringify(
    (plan.overrides ?? []).map((o) => ({ employee_id: o.employeeId })),
  );
  const { rows } = await db.execute(sql`
    WITH p AS (${raisePlanRows(plan)})
    SELECT
      (SELECT count(*) FROM jsonb_to_recordset(${overrides}::jsonb) AS o(employee_id uuid)
        WHERE NOT EXISTS (SELECT 1 FROM ${employees}
          WHERE ${employees.id} = o.employee_id AND ${employees.status} = 'active')) AS not_active,
      (SELECT array_agg(full_name ORDER BY full_name) FROM p
        WHERE individual AND new_amount <= salary_amount) AS not_raised,
      (SELECT array_agg(full_name ORDER BY full_name) FROM p
        WHERE ${effectiveOn}::date < hire_date
           OR ${effectiveOn}::date < (SELECT max(${salaryRevisions.effectiveOn}) FROM ${salaryRevisions}
                                      WHERE ${salaryRevisions.employeeId} = p.id)) AS too_early
  `);
  const row = rows[0] ?? {};
  return {
    notActive: Number(row.not_active ?? 0),
    notRaised: (row.not_raised as string[] | null) ?? [],
    tooEarly: (row.too_early as string[] | null) ?? [],
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
  const { rows } = await db.execute(sql`
    WITH p AS (${raisePlanRows(plan)}),
    changed AS (SELECT * FROM p WHERE new_amount <> salary_amount),
    -- Data-modifying CTEs always run, referenced or not.
    inserted AS (
      INSERT INTO ${salaryRevisions}
        (employee_id, amount, previous_amount, currency, effective_on, reason, note)
      SELECT id, new_amount, salary_amount, salary_currency, ${revision.effectiveOn}::date,
             ${revision.reason}, ${revision.note}
      FROM changed
      RETURNING 1
    ),
    updated AS (
      UPDATE ${employees} SET salary_amount = changed.new_amount, updated_at = now()
      FROM changed WHERE ${employees.id} = changed.id
      RETURNING 1
    )
    SELECT (SELECT count(*) FROM updated) AS applied,
           (SELECT count(*) FROM p) - (SELECT count(*) FROM changed) AS skipped
  `);
  const row = rows[0] ?? {};
  return { applied: Number(row.applied), skipped: Number(row.skipped) };
}
