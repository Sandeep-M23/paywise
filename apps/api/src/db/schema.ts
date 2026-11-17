import { sql } from "drizzle-orm";
import {
  bigint,
  char,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeCode: text("employee_code").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    jobTitle: text("job_title").notNull(),
    department: text("department").notNull(),
    countryCode: char("country_code", { length: 2 }).notNull(),
    // Minor units (see packages/shared/src/money.ts). Denormalised copy of the
    // latest salary revision, written only by the salary revision service.
    salaryAmount: bigint("salary_amount", { mode: "number" }).notNull(),
    salaryCurrency: char("salary_currency", { length: 3 }).notNull(),
    gender: text("gender").notNull().default("undisclosed"),
    employmentType: text("employment_type").notNull(),
    hireDate: date("hire_date", { mode: "string" }).notNull(),
    status: text("status").notNull().default("active"),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    deactivationReason: text("deactivation_reason"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("employees_code_unique").on(t.employeeCode),
    uniqueIndex("employees_email_unique").on(sql`lower(${t.email})`),
    index("employees_country_title_idx").on(t.countryCode, t.jobTitle),
    index("employees_country_department_idx").on(t.countryCode, t.department),
    index("employees_status_idx").on(t.status),
    index("employees_name_trgm_idx").using("gin", sql`${t.fullName} gin_trgm_ops`),
    check("employees_salary_positive", sql`${t.salaryAmount} > 0`),
  ],
);

export const imports = pgTable("imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  rowCount: integer("row_count").notNull(),
  createdCount: integer("created_count").notNull(),
  updatedCount: integer("updated_count").notNull(),
  skippedCount: integer("skipped_count").notNull(),
  status: text("status").notNull().default("committed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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

export type EmployeeRow = typeof employees.$inferSelect;
export type NewEmployeeRow = typeof employees.$inferInsert;
export type SalaryRevisionRow = typeof salaryRevisions.$inferSelect;
export type ImportRow = typeof imports.$inferSelect;
