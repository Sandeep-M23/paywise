import { randomUUID } from "node:crypto";
import { currencyForCountry } from "@paywise/shared";
import { execute, inTransaction, type Db } from "../../config/db";
import { Employee, SalaryRevision } from "../../models";
import type { SeedEmployee } from "./generate";

const BATCH_SIZE = 1_000;

/**
 * Replaces all data with the given people in one transaction, inserting in
 * batches (one round trip per 1,000 rows instead of one per row).
 */
export async function seedDatabase(db: Db, people: SeedEmployee[]) {
  await inTransaction(db, async (tx) => {
    await execute(tx, "TRUNCATE salary_revisions, employees, imports CASCADE");

    for (let start = 0; start < people.length; start += BATCH_SIZE) {
      const batch = people.slice(start, start + BATCH_SIZE).map((person) => ({
        ...person,
        id: randomUUID(),
        revisionIds: person.history.map(() => randomUUID()),
        currency: currencyForCountry(person.employee.countryCode),
      }));

      await Employee.bulkCreate(
        batch.map(({ id, revisionIds, history, currency, employee, deactivationReason }) => ({
          id,
          ...employee,
          salaryCurrency: currency,
          // The cache holds the latest revision (the generated history ends at or before its reference date).
          currentRevisionId: revisionIds.at(-1)!,
          salaryEffectiveOn: history.at(-1)!.effectiveOn,
          deactivatedAt: deactivationReason ? new Date() : null,
          deactivationReason: deactivationReason ?? null,
          ...(deactivationReason ? { status: "inactive" } : {}),
        })),
        { transaction: tx.transaction },
      );
      await SalaryRevision.bulkCreate(
        batch.flatMap(({ id, revisionIds, currency, history }) =>
          history.map((revision, i) => ({
            id: revisionIds[i]!,
            employeeId: id,
            amount: revision.amount,
            currency,
            effectiveOn: revision.effectiveOn,
            reason: revision.reason,
            createdBy: "seed",
          })),
        ),
        { transaction: tx.transaction },
      );
    }
  });
}
