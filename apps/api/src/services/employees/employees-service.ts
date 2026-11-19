import { randomUUID } from "node:crypto";
import {
  currencyForCountry,
  type EmployeeCreateInput,
  type EmployeeDetail,
  type EmployeeListQuery,
  type EmployeeSummary,
  type EmployeeUpdateInput,
  type Page,
  type RaiseApplyRequest,
  type RaiseApplyResult,
  type SalaryRevisionCreateInput,
} from "@paywise/shared";
import { inTransaction, type Db } from "../../config/db";
import type { Clock } from "../../utils/helpers/clock";
import { conflict, mapDbError, notFound, invalid } from "../../utils/helpers/errors";
import * as repo from "./employees-repository";
import { toEmployeeDetail, toEmployeeSummary } from "../../utils/helpers/dto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Who is acting: recorded on every revision (and, later, in the audit log). */
export type Actor = { by?: string };
const actorOf = (actor: Actor) => actor.by ?? "system";

async function loadDetail(db: Db, id: string, today: string): Promise<EmployeeDetail> {
  const row = await repo.findEmployee(db, id);
  if (!row) throw notFound("Employee");
  return toEmployeeDetail(row, await repo.listRevisions(db, id, today));
}

async function assertUniqueIdentity(
  db: Db,
  { employeeCode, email }: { employeeCode?: string; email?: string },
  excludeId?: string,
) {
  if (employeeCode && (await repo.findEmployeeIdByCode(db, employeeCode))) {
    throw conflict("duplicate_employee_code", "Employee code already exists");
  }
  if (email && (await repo.findEmployeeIdByEmail(db, email, excludeId))) {
    throw conflict("duplicate_email", "Email already belongs to an employee");
  }
}

/**
 * Inserts an employee and its "hire" revision, with the cache pointing at it (the
 * deferred foreign key checks the pair at commit). Must run inside a transaction.
 * Shared with CSV import so both paths obey the same rules.
 */
export async function insertEmployeeWithHireRevision(
  tx: Db,
  input: EmployeeCreateInput,
  { importId = null, by = "system" }: { importId?: string | null; by?: string } = {},
) {
  const currency = input.salaryCurrency ?? currencyForCountry(input.countryCode);
  const hireRevisionId = randomUUID();
  const { salaryCurrency: _override, ...fields } = input;
  const row = await repo.insertEmployee(tx, {
    ...fields,
    salaryCurrency: currency,
    salaryEffectiveOn: input.hireDate,
    currentRevisionId: hireRevisionId,
  });
  await repo.insertRevision(tx, {
    id: hireRevisionId,
    employeeId: row.id,
    amount: input.salaryAmount,
    currency,
    effectiveOn: input.hireDate,
    reason: "hire",
    importId,
    createdBy: by,
  });
  return row;
}

/** "A, B, C and 4 others": enough to find the people without a wall of names. */
function names(list: string[], shown = 3) {
  const head = list.slice(0, shown).join(", ");
  return list.length > shown ? `${head} and ${list.length - shown} others` : head;
}

export function createEmployeeService({ db, clock }: { db: Db; clock: Clock }) {
  async function lockEmployee(tx: Db, id: string) {
    const row = UUID.test(id) ? await repo.findEmployee(tx, id, { lock: true }) : undefined;
    if (!row) throw notFound("Employee");
    return row;
  }

  return {
    async list(query: EmployeeListQuery): Promise<Page<EmployeeSummary>> {
      const { rows, total } = await repo.listEmployees(db, query);
      return {
        data: rows.map(toEmployeeSummary),
        page: query.page,
        pageSize: query.pageSize,
        total,
      };
    },

    async get(id: string): Promise<EmployeeDetail> {
      if (!UUID.test(id)) throw notFound("Employee");
      return loadDetail(db, id, clock.today());
    },

    /** A hire date in the future is allowed: a pre-boarded hire, paid from that date. */
    async create(input: EmployeeCreateInput, actor: Actor = {}): Promise<EmployeeDetail> {
      return inTransaction(db, async (tx) => {
        await assertUniqueIdentity(tx, input);
        const row = await insertEmployeeWithHireRevision(tx, input, { by: actorOf(actor) });
        return loadDetail(tx, row.id, clock.today());
      }).catch(mapDbError);
    },

    async update(id: string, patch: EmployeeUpdateInput): Promise<EmployeeDetail> {
      const today = clock.today();
      return inTransaction(db, async (tx) => {
        const current = await lockEmployee(tx, id);
        if (patch.email) await assertUniqueIdentity(tx, { email: patch.email }, id);

        if (patch.hireDate && patch.hireDate !== current.hireDate) {
          const firstChange = await repo.earliestChange(tx, id);
          if (firstChange && patch.hireDate >= firstChange) {
            throw invalid(
              "hireDate",
              `Hire date must be before the first salary change (${firstChange})`,
            );
          }
          await repo.moveHireRevision(tx, id, patch.hireDate);
        }

        await repo.updateEmployee(tx, id, patch);
        await repo.refreshSalaryCache(tx, today, [id]);
        return loadDetail(tx, id, today);
      }).catch(mapDbError);
    },

    /** Deactivation keeps history and cancels anything still scheduled. */
    async deactivate(id: string, { reason }: { reason: string }): Promise<EmployeeDetail> {
      const today = clock.today();
      return inTransaction(db, async (tx) => {
        const current = await lockEmployee(tx, id);
        if (current.status === "inactive") {
          throw conflict("employee_inactive", "Employee is already inactive");
        }
        await repo.cancelScheduled(tx, id, today);
        await repo.updateEmployee(tx, id, {
          status: "inactive",
          deactivatedAt: new Date(),
          deactivationReason: reason,
        });
        await repo.refreshSalaryCache(tx, today, [id]);
        return loadDetail(tx, id, today);
      }).catch(mapDbError);
    },

    /**
     * The only way a salary changes: append a revision, effective on a past,
     * current or future date, then point the cache at the current revision (a
     * scheduled one leaves it alone until its date). Rules in docs/DESIGN.md §2.1.
     */
    async changeSalary(
      id: string,
      input: SalaryRevisionCreateInput,
      actor: Actor = {},
    ): Promise<EmployeeDetail> {
      const today = clock.today();
      return inTransaction(db, async (tx) => {
        const current = await lockEmployee(tx, id);
        if (current.status === "inactive") {
          throw conflict("employee_inactive", "Cannot change the salary of an inactive employee");
        }

        // Someone else changed the salary since the user loaded it: don't build on
        // a value they never saw (SCHEMA_REVIEW F1).
        const head = await repo.timelineHead(tx, id);
        if (input.basedOnRevisionId && head && input.basedOnRevisionId !== head.id) {
          throw conflict(
            "stale_salary",
            "Someone else changed this salary since you opened it; reload and try again",
          );
        }

        if (input.effectiveOn < current.hireDate) {
          throw invalid(
            "effectiveOn",
            `Effective date cannot be before the hire date (${current.hireDate})`,
          );
        }

        let corrected: { currency: string } | undefined;
        if (input.reason === "correction") {
          const target = await repo.findRevision(tx, id, input.correctsRevisionId!);
          if (!target || target.cancelledAt) throw notFound("Salary change to correct");
          if (target.effectiveOn !== input.effectiveOn) {
            throw invalid("effectiveOn", "A correction uses the date of the change it corrects");
          }
          if ((await repo.latestOnDate(tx, id, input.effectiveOn)) !== target.id) {
            throw conflict(
              "already_corrected",
              "That change was already corrected; correct the newest one",
            );
          }
          corrected = target;
        } else {
          if (await repo.latestOnDate(tx, id, input.effectiveOn)) {
            throw conflict(
              "revision_date_taken",
              "There is already a salary change on that date; record a correction instead",
            );
          }
          // Backdating before the current revision would rewrite pay already made.
          if (current.salaryEffectiveOn <= today && input.effectiveOn < current.salaryEffectiveOn) {
            throw invalid(
              "effectiveOn",
              `Effective date cannot be before the current salary's date (${current.salaryEffectiveOn}); record a correction instead`,
            );
          }
        }

        const before = await repo.inForceBefore(tx, id, input.effectiveOn);
        // A correction keeps the corrected change's currency unless told otherwise.
        const baseCurrency = corrected?.currency ?? before?.currency ?? current.salaryCurrency;
        const currency = input.currency ?? baseCurrency;
        if (input.reason === "currency_change" && currency === baseCurrency) {
          throw invalid("currency", "Choose a different currency for a currency change");
        }
        if (
          input.reason !== "currency_change" &&
          input.reason !== "correction" &&
          currency !== baseCurrency
        ) {
          throw invalid("currency", "To change the currency, use the reason “currency change”");
        }
        if (
          input.reason !== "correction" &&
          before &&
          before.amount === input.amount &&
          before.currency === currency
        ) {
          throw invalid("amount", "New salary is the same as the salary in force on that date");
        }

        await repo.insertRevision(tx, {
          employeeId: id,
          amount: input.amount,
          currency,
          effectiveOn: input.effectiveOn,
          reason: input.reason,
          note: input.note ?? null,
          correctsRevisionId: input.correctsRevisionId ?? null,
          createdBy: actorOf(actor),
        });
        await repo.refreshSalaryCache(tx, today, [id]);
        return loadDetail(tx, id, today);
      }).catch(mapDbError);
    },

    /** Cancels a scheduled change (with its corrections). A change already in force can't be. */
    async cancelRevision(id: string, revisionId: string): Promise<EmployeeDetail> {
      const today = clock.today();
      return inTransaction(db, async (tx) => {
        await lockEmployee(tx, id);
        const target = UUID.test(revisionId)
          ? await repo.findRevision(tx, id, revisionId)
          : undefined;
        if (!target || target.cancelledAt) throw notFound("Salary change");
        if (target.reason === "hire") {
          throw conflict("not_scheduled", "A hire can't be cancelled; deactivate the employee");
        }
        if (target.effectiveOn <= today) {
          throw conflict("not_scheduled", "Only a scheduled change can be cancelled");
        }
        await repo.cancelOnDate(tx, id, target.effectiveOn);
        await repo.refreshSalaryCache(tx, today, [id]);
        return loadDetail(tx, id, today);
      }).catch(mapDbError);
    },

    /**
     * Applies a raise plan as salary revisions, all or nothing: the same rules as
     * changeSalary for every person, checked in SQL against locked rows. A future
     * date makes every revision scheduled.
     */
    async applyRaises(request: RaiseApplyRequest, actor: Actor = {}): Promise<RaiseApplyResult> {
      const today = clock.today();
      const plan = {
        ...request,
        percent: request.percent ?? 0,
        overrides: request.overrides ?? [],
      };
      return inTransaction(db, async (tx) => {
        await repo.lockRaisePlan(tx, plan);
        const problems = await repo.raisePlanProblems(tx, plan, request.effectiveOn);
        if (problems.notActive > 0) {
          throw invalid("overrides", "Individual raises can only go to active employees");
        }
        if (problems.notRaised.length > 0) {
          throw invalid(
            "overrides",
            `A new salary must be above the current one (${names(problems.notRaised)})`,
          );
        }
        if (problems.tooEarly.length > 0) {
          throw invalid(
            "effectiveOn",
            `Effective date is before the hire date or current salary of ${names(problems.tooEarly)}`,
          );
        }
        if (problems.dateTaken.length > 0) {
          throw invalid(
            "effectiveOn",
            `${names(problems.dateTaken)} already ${problems.dateTaken.length === 1 ? "has" : "have"} a salary change on that date`,
          );
        }
        const result = await repo.applyRaisePlan(tx, plan, {
          effectiveOn: request.effectiveOn,
          reason: request.reason,
          note: request.note ?? null,
          createdBy: actorOf(actor),
        });
        await repo.refreshSalaryCache(tx, today, result.employeeIds);
        return {
          applied: result.applied,
          skipped: result.skipped,
          scheduled: request.effectiveOn > today ? result.applied : 0,
        };
      }).catch(mapDbError);
    },

    /**
     * Moves every cache to its current revision: run daily (Vercel Cron), on start-up
     * and safe to repeat. Locks the stale rows first, then updates them in a later
     * statement, so a correction committed meanwhile isn't overwritten.
     */
    async promoteDueRevisions(): Promise<{ promoted: number }> {
      const today = clock.today();
      return inTransaction(db, async (tx) => {
        const ids = await repo.lockStaleCaches(tx, today);
        return { promoted: await repo.refreshSalaryCache(tx, today, ids) };
      }).catch(mapDbError);
    },

    /** How many employees' cached salary isn't their current revision (0 when healthy). */
    async cacheDrift(): Promise<number> {
      return repo.cacheDrift(db, clock.today());
    },
  };
}

export type EmployeeService = ReturnType<typeof createEmployeeService>;
