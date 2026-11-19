import { sql } from "drizzle-orm";
import {
  bigint,
  char,
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { employees } from "./Employee";
import { imports } from "./Import";

// Append-only: a mistake is fixed with a new "correction" revision.
export const salaryRevisions = pgTable(
  "salary_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    previousAmount: bigint("previous_amount", { mode: "number" }),
    currency: char("currency", { length: 3 }).notNull(),
    effectiveOn: date("effective_on", { mode: "string" }).notNull(),
    reason: text("reason").notNull(),
    note: text("note"),
    importId: uuid("import_id").references(() => imports.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("salary_revisions_employee_effective_idx").on(t.employeeId, t.effectiveOn),
    index("salary_revisions_import_idx").on(t.importId),
    check("salary_revisions_amount_positive", sql`${t.amount} > 0`),
  ],
);

export type SalaryRevisionRow = typeof salaryRevisions.$inferSelect;
