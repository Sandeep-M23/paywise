import {
  EXPORT_HEADERS,
  employeeToCsvRecord,
  toCsv,
  type EmployeeListQuery,
} from "@paywise/shared";
import { select, type Db } from "../../config/db";
import type { EmployeeRow } from "../../models";
import { EMPLOYEE_COLUMNS, employeeFilters } from "../employees/employees-repository";
import { toEmployeeSummary } from "../../utils/helpers/dto";

type ExportFilters = Pick<
  EmployeeListQuery,
  "status" | "country" | "jobTitle" | "department" | "q"
>;

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
    async employeesCsv(filters: ExportFilters): Promise<string> {
      const where = employeeFilters(filters);
      const rows = await select<EmployeeRow>(
        db,
        `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE ${where.sql} ORDER BY employee_code`,
        where.replacements,
      );
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
