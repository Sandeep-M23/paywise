import { asc } from "drizzle-orm";
import {
  EXPORT_HEADERS,
  employeeToCsvRecord,
  toCsv,
  type EmployeeListQuery,
} from "@paywise/shared";
import type { Db } from "../../config/db";
import { employees } from "../../models";
import { employeeFilters } from "../employees/employees-repository";
import { toEmployeeSummary } from "../../utils/helpers/dto";

type ExportFilters = Pick<
  EmployeeListQuery,
  "status" | "country" | "jobTitle" | "department" | "q"
>;

// Headers match what autoMapColumns recognises, so the template, an export and
// a hand-made file all import the same way.
const TEMPLATE_HEADERS = [
  "employee_code",
  "full_name",
  "email",
  "job_title",
  "department",
  "country",
  "salary",
  "employment_type",
  "hire_date",
  "gender",
];

export function createExportService({ db }: { db: Db }) {
  return {
    /** Same filters as the directory, all matching rows, Excel-safe CSV. */
    async employeesCsv(filters: ExportFilters): Promise<string> {
      const rows = await db
        .select()
        .from(employees)
        .where(employeeFilters(filters))
        .orderBy(asc(employees.employeeCode));
      return toCsv(
        EXPORT_HEADERS,
        rows.map((row) => employeeToCsvRecord(toEmployeeSummary(row))),
      );
    },

    templateCsv(): string {
      return toCsv(TEMPLATE_HEADERS, [
        [
          "EMP-10001",
          "Asha Rao",
          "asha.rao@acme.test",
          "Data Analyst",
          "Data",
          "IN",
          "18,00,000",
          "full_time",
          "2024-04-01",
          "female",
        ],
        [
          "EMP-10002",
          "Tom Becker",
          "tom.becker@acme.test",
          "Account Executive",
          "Sales",
          "DE",
          "65000.00",
          "full_time",
          "2023-09-15",
          "",
        ],
      ]);
    },
  };
}

export type ExportService = ReturnType<typeof createExportService>;
