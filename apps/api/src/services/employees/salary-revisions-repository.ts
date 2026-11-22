import { select, type Db } from "../../config/db";
import { SalaryRevision, type SalaryRevisionRow } from "../../models";

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

export type RevisionWithState = SalaryRevisionRow & {
  previousAmount: number | null;
  state: "historical" | "current" | "scheduled" | "corrected" | "cancelled";
};

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

export async function findRevision(db: Db, employeeId: string, revisionId: string) {
  const row = await SalaryRevision.findOne({
    where: { id: revisionId, employeeId },
    raw: true,
    transaction: db.transaction,
  });
  return (row as SalaryRevisionRow | null) ?? undefined;
}

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

export async function earliestChange(db: Db, employeeId: string) {
  const [row] = await select<{ d: string | null }>(
    db,
    `SELECT min(effective_on) AS d FROM salary_revisions
     WHERE employee_id = :employeeId AND reason <> 'hire' AND cancelled_at IS NULL`,
    { employeeId },
  );
  return row?.d ?? null;
}

export async function moveHireRevision(db: Db, employeeId: string, effectiveOn: string) {
  await SalaryRevision.update(
    { effectiveOn },
    { where: { employeeId, reason: "hire" }, transaction: db.transaction },
  );
}

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

const CACHE_TARGETS = `
  SELECT DISTINCT ON (r.employee_id) r.employee_id, r.id, r.amount, r.currency, r.effective_on
  FROM salary_revisions r
  WHERE r.cancelled_at IS NULL {{employees}}
  ORDER BY r.employee_id,
    (r.effective_on <= CAST(:today AS date)) DESC,
    CASE WHEN r.effective_on <= CAST(:today AS date) THEN r.effective_on END DESC NULLS LAST,
    r.effective_on ASC,
    r.created_at DESC`;

const CACHE_IS_STALE = `(e.current_revision_id, e.salary_amount, e.salary_currency, e.salary_effective_on)
  IS DISTINCT FROM (t.id, t.amount, t.currency, t.effective_on)`;

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
