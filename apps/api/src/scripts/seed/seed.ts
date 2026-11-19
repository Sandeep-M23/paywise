import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { currencyForCountry } from "@paywise/shared";
import type { Db } from "../../config/db";
import { employees, salaryRevisions } from "../../models";
import type { SeedEmployee } from "./generate";

const BATCH_SIZE = 1_000;

/**
 * Replaces all data with the given people in one transaction, inserting in
 * batches (one round trip per 1,000 rows instead of one per row).
 */
export async function seedDatabase(db: Db, people: SeedEmployee[]) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE salary_revisions, employees, imports CASCADE`);

    for (let start = 0; start < people.length; start += BATCH_SIZE) {
      const batch = people.slice(start, start + BATCH_SIZE).map((person) => ({
        ...person,
        id: randomUUID(),
        currency: currencyForCountry(person.employee.countryCode),
      }));

      await tx.insert(employees).values(
        batch.map(({ id, currency, employee, deactivationReason }) => ({
          id,
          ...employee,
          salaryCurrency: currency,
          ...(deactivationReason
            ? { status: "inactive", deactivatedAt: new Date(), deactivationReason }
            : {}),
        })),
      );
      await tx.insert(salaryRevisions).values(
        batch.flatMap(({ id, currency, history }) =>
          history.map((revision, i) => ({
            employeeId: id,
            amount: revision.amount,
            previousAmount: i === 0 ? null : history[i - 1]!.amount,
            currency,
            effectiveOn: revision.effectiveOn,
            reason: revision.reason,
          })),
        ),
      );
    }
  });
}
