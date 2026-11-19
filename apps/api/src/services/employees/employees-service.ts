import {
  currencyForCountry,
  type EmployeeCreateInput,
  type EmployeeDetail,
  type EmployeeListQuery,
  type EmployeeSummary,
  type EmployeeUpdateInput,
  type Page,
  type SalaryRevisionCreateInput,
  type RaiseApplyRequest,
  type RaiseApplyResult,
} from "@paywise/shared";
import type { Db } from "../../config/db";
import type { Clock } from "../../utils/helpers/clock";
import { conflict, invalid, mapDbError, notFound } from "../../utils/helpers/errors";
import * as repo from "./employees-repository";
import { toEmployeeDetail, toEmployeeSummary } from "../../utils/helpers/dto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadDetail(db: Db, id: string): Promise<EmployeeDetail> {
  const row = await repo.findEmployee(db, id);
  if (!row) throw notFound("Employee");
  return toEmployeeDetail(row, await repo.listRevisions(db, id));
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
 * Inserts an employee and its "hire" revision. Must run inside a transaction.
 * Shared with CSV import so both paths obey the same rules.
 */
export async function insertEmployeeWithHireRevision(
  tx: Db,
  input: EmployeeCreateInput,
  importId: string | null = null,
) {
  const currency = currencyForCountry(input.countryCode);
  const row = await repo.insertEmployee(tx, { ...input, salaryCurrency: currency });
  await repo.insertRevision(tx, {
    employeeId: row.id,
    amount: input.salaryAmount,
    previousAmount: null,
    currency,
    effectiveOn: input.hireDate,
    reason: "hire",
    importId,
  });
  return row;
}

/** "A, B, C and 4 others": enough to find the people without a wall of names. */
function names(list: string[], shown = 3) {
  const head = list.slice(0, shown).join(", ");
  return list.length > shown ? `${head} and ${list.length - shown} others` : head;
}

export function createEmployeeService({ db, clock }: { db: Db; clock: Clock }) {
  function assertNotFuture(path: string, date: string, label: string) {
    if (date > clock.today()) throw invalid(path, `${label} cannot be in the future`);
  }

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
      return loadDetail(db, id);
    },

    async create(input: EmployeeCreateInput): Promise<EmployeeDetail> {
      assertNotFuture("hireDate", input.hireDate, "Hire date");
      return db
        .transaction(async (tx) => {
          await assertUniqueIdentity(tx, input);
          const row = await insertEmployeeWithHireRevision(tx, input);
          return loadDetail(tx, row.id);
        })
        .catch(mapDbError);
    },

    async update(id: string, patch: EmployeeUpdateInput): Promise<EmployeeDetail> {
      return db
        .transaction(async (tx) => {
          const current = await lockEmployee(tx, id);
          if (patch.email) await assertUniqueIdentity(tx, { email: patch.email }, id);

          if (patch.hireDate && patch.hireDate !== current.hireDate) {
            assertNotFuture("hireDate", patch.hireDate, "Hire date");
            const { earliestChange } = await repo.revisionDateBounds(tx, id);
            if (earliestChange && patch.hireDate > earliestChange) {
              throw invalid(
                "hireDate",
                `Hire date cannot be after the first salary change (${earliestChange})`,
              );
            }
            await repo.moveHireRevision(tx, id, patch.hireDate);
          }

          await repo.updateEmployee(tx, id, patch);
          return loadDetail(tx, id);
        })
        .catch(mapDbError);
    },

    async deactivate(id: string, { reason }: { reason: string }): Promise<EmployeeDetail> {
      return db.transaction(async (tx) => {
        const current = await lockEmployee(tx, id);
        if (current.status === "inactive") {
          throw conflict("employee_inactive", "Employee is already inactive");
        }
        await repo.updateEmployee(tx, id, {
          status: "inactive",
          deactivatedAt: new Date(),
          deactivationReason: reason,
        });
        return loadDetail(tx, id);
      });
    },

    /** The only way a salary changes: append a revision and update the current amount together. */
    async changeSalary(id: string, input: SalaryRevisionCreateInput): Promise<EmployeeDetail> {
      return db.transaction(async (tx) => {
        const current = await lockEmployee(tx, id);
        if (current.status === "inactive") {
          throw conflict("employee_inactive", "Cannot change the salary of an inactive employee");
        }

        assertNotFuture("effectiveOn", input.effectiveOn, "Effective date");
        if (input.effectiveOn < current.hireDate) {
          throw invalid(
            "effectiveOn",
            `Effective date cannot be before the hire date (${current.hireDate})`,
          );
        }
        const { latest } = await repo.revisionDateBounds(tx, id);
        if (latest && input.effectiveOn < latest) {
          throw invalid(
            "effectiveOn",
            `Effective date cannot be before the latest change (${latest})`,
          );
        }
        if (input.amount === current.salaryAmount) {
          throw invalid("amount", "New salary is the same as the current salary");
        }

        await repo.insertRevision(tx, {
          employeeId: id,
          amount: input.amount,
          previousAmount: current.salaryAmount,
          currency: current.salaryCurrency,
          effectiveOn: input.effectiveOn,
          reason: input.reason,
          note: input.note ?? null,
        });
        await repo.updateEmployee(tx, id, { salaryAmount: input.amount });
        return loadDetail(tx, id);
      });
    },

    /**
     * Applies a raise plan as salary revisions, all or nothing: the same rules as
     * changeSalary for every person, checked in SQL against locked rows.
     */
    async applyRaises(request: RaiseApplyRequest): Promise<RaiseApplyResult> {
      assertNotFuture("effectiveOn", request.effectiveOn, "Effective date");
      const plan = {
        ...request,
        percent: request.percent ?? 0,
        overrides: request.overrides ?? [],
      };
      return db.transaction(async (tx) => {
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
            `Effective date is before the hire date or latest salary change for ${names(problems.tooEarly)}`,
          );
        }
        return repo.applyRaisePlan(tx, plan, {
          effectiveOn: request.effectiveOn,
          reason: request.reason,
          note: request.note ?? null,
        });
      });
    },
  };
}

export type EmployeeService = ReturnType<typeof createEmployeeService>;
