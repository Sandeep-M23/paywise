import type { RaiseApplyResult, RaiseCostRequest } from "@paywise/shared";
import { select, type Db } from "../../config/db";
import type { Where } from "./employees-repository";

const asList = <T>(value: T | T[] | undefined): T[] | undefined =>
  value === undefined ? undefined : Array.isArray(value) ? value : [value];

type RaisePlanInput = Pick<RaiseCostRequest, "percent" | "country" | "jobTitle" | "department"> & {
  overrides?: RaiseCostRequest["overrides"];
};

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

export async function lockRaisePlan(db: Db, plan: RaisePlanInput) {
  const p = raisePlanRows(plan);
  await select(
    db,
    `SELECT id FROM employees WHERE id IN (SELECT id FROM (${p.sql}) AS p)
     ORDER BY id FOR NO KEY UPDATE`,
    p.replacements,
  );
}

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
