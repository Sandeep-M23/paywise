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
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./timestamps";

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

export type EmployeeRow = typeof employees.$inferSelect;
export type NewEmployeeRow = typeof employees.$inferInsert;
