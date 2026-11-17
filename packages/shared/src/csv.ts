import { COUNTRIES, type CountryCode } from "./countries";
import type { EmployeeSummary } from "./dto";
import { parseMoneyInput, toMajorString } from "./money";
import {
  employeeCreateSchema,
  type EmployeeCreateInput,
  type EmploymentType,
  type Gender,
} from "./schemas";

/*
 * CSV helpers shared by the import wizard (browser) and the import/export API.
 * Spreadsheets are messy, so parsing is forgiving about formats people really
 * use (Indian digit grouping, "Full-time", "India" vs "IN") but strict about
 * anything ambiguous, and reports every problem with the field it belongs to.
 */

export const IMPORT_FIELDS = [
  "employeeCode",
  "fullName",
  "email",
  "jobTitle",
  "department",
  "countryCode",
  "salary",
  "employmentType",
  "hireDate",
  "gender",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export const REQUIRED_IMPORT_FIELDS = IMPORT_FIELDS.filter((f) => f !== "gender");

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  employeeCode: "Employee code",
  fullName: "Full name",
  email: "Email",
  jobTitle: "Job title",
  department: "Department",
  countryCode: "Country",
  salary: "Annual salary",
  employmentType: "Employment type",
  hireDate: "Hire date (YYYY-MM-DD)",
  gender: "Gender (optional)",
};

const normaliseHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, "");

const HEADER_SYNONYMS: Record<ImportField, string[]> = {
  employeeCode: ["employeecode", "empcode", "employeeid", "empid", "employeeno", "empno", "code"],
  fullName: ["fullname", "name", "employeename", "empname"],
  email: ["email", "emailaddress", "workemail", "officialemail"],
  jobTitle: ["jobtitle", "title", "designation", "role", "position"],
  department: ["department", "dept", "team", "function"],
  countryCode: ["country", "countrycode", "location"],
  salary: ["salary", "annualsalary", "basesalary", "ctc", "annualctc", "pay", "compensation"],
  employmentType: ["employmenttype", "type", "contracttype", "workertype"],
  hireDate: ["hiredate", "dateofjoining", "doj", "joiningdate", "startdate", "datehired"],
  gender: ["gender", "sex"],
};

/** Suggests which spreadsheet column feeds each field; the user can override it. */
export function autoMapColumns(headers: string[]): Record<ImportField, string | null> {
  const used = new Set<string>();
  const mapping = {} as Record<ImportField, string | null>;
  for (const field of IMPORT_FIELDS) {
    const match = HEADER_SYNONYMS[field]
      .map((synonym) => headers.find((h) => !used.has(h) && normaliseHeader(h) === synonym))
      .find((h) => h !== undefined);
    mapping[field] = match ?? null;
    if (match) used.add(match);
  }
  return mapping;
}

const COUNTRY_ALIASES: Record<string, CountryCode> = {
  uk: "GB",
  greatbritain: "GB",
  england: "GB",
  usa: "US",
  unitedstatesofamerica: "US",
  america: "US",
  deutschland: "DE",
  bharat: "IN",
};

function parseCountry(value: string): CountryCode | null {
  const key = normaliseHeader(value);
  const match = COUNTRIES.find(
    (c) => c.code.toLowerCase() === key || normaliseHeader(c.name) === key,
  );
  return match?.code ?? COUNTRY_ALIASES[key] ?? null;
}

const EMPLOYMENT_ALIASES: Record<string, EmploymentType> = {
  fulltime: "full_time",
  ft: "full_time",
  permanent: "full_time",
  parttime: "part_time",
  pt: "part_time",
  contract: "contract",
  contractor: "contract",
};

const GENDER_ALIASES: Record<string, Gender> = {
  female: "female",
  f: "female",
  woman: "female",
  male: "male",
  m: "male",
  man: "male",
  nonbinary: "non_binary",
  nb: "non_binary",
  undisclosed: "undisclosed",
  prefernottosay: "undisclosed",
  notspecified: "undisclosed",
};

export type ImportRowValues = Partial<Record<ImportField, string>>;
export type EmployeeImportInput = Omit<EmployeeCreateInput, "gender"> & { gender?: Gender };
export type ImportFieldError = { field: ImportField; message: string };
export type ParsedImportRow =
  { ok: true; value: EmployeeImportInput } | { ok: false; errors: ImportFieldError[] };

const SCHEMA_FIELDS = [
  "employeeCode",
  "fullName",
  "email",
  "jobTitle",
  "department",
  "hireDate",
] as const;
const identitySchema = employeeCreateSchema.pick({
  employeeCode: true,
  fullName: true,
  email: true,
  jobTitle: true,
  department: true,
  hireDate: true,
});

/** Turns one spreadsheet row (already mapped to fields) into a validated employee. */
export function parseImportRow(values: ImportRowValues): ParsedImportRow {
  const errors: ImportFieldError[] = [];
  const text = (field: ImportField) => values[field]?.trim() ?? "";
  const missing = (field: ImportField) => {
    if (text(field) !== "") return false;
    errors.push({ field, message: `${IMPORT_FIELD_LABELS[field]} is required` });
    return true;
  };

  let countryCode: CountryCode | null = null;
  if (!missing("countryCode")) {
    countryCode = parseCountry(text("countryCode"));
    if (!countryCode) {
      errors.push({
        field: "countryCode",
        message: `Unknown country "${text("countryCode")}". Use one of ${COUNTRIES.map((c) => c.code).join(", ")}`,
      });
    }
  }

  let salaryAmount: number | null = null;
  if (!missing("salary")) {
    if (!countryCode) {
      errors.push({ field: "salary", message: "Salary can't be read without a valid country" });
    } else {
      const currency = COUNTRIES.find((c) => c.code === countryCode)!.currency;
      const parsed = parseMoneyInput(text("salary"), currency);
      if (!parsed.ok) errors.push({ field: "salary", message: parsed.error });
      else if (parsed.value <= 0)
        errors.push({ field: "salary", message: "Salary must be greater than zero" });
      else salaryAmount = parsed.value;
    }
  }

  let employmentType: EmploymentType | null = null;
  if (!missing("employmentType")) {
    employmentType = EMPLOYMENT_ALIASES[normaliseHeader(text("employmentType"))] ?? null;
    if (!employmentType) {
      errors.push({
        field: "employmentType",
        message: "Employment type must be full-time, part-time or contract",
      });
    }
  }

  let gender: Gender | undefined;
  if (text("gender") !== "") {
    gender = GENDER_ALIASES[normaliseHeader(text("gender"))];
    if (!gender) {
      errors.push({
        field: "gender",
        message: "Gender must be female, male, non-binary or undisclosed",
      });
    }
  }

  const blank = SCHEMA_FIELDS.filter((field) => missing(field));
  const identity = identitySchema.safeParse(
    Object.fromEntries(SCHEMA_FIELDS.map((field) => [field, text(field)])),
  );
  if (!identity.success) {
    for (const issue of identity.error.issues) {
      const field = issue.path[0] as ImportField;
      if (!blank.includes(field as (typeof SCHEMA_FIELDS)[number])) {
        errors.push({ field, message: issue.message });
      }
    }
  }

  if (errors.length > 0 || !identity.success) return { ok: false, errors };
  return {
    ok: true,
    value: {
      ...identity.data,
      countryCode: countryCode!,
      salaryAmount: salaryAmount!,
      employmentType: employmentType!,
      ...(gender ? { gender } : {}),
    },
  };
}

// --- Export -----------------------------------------------------------------

// Snake-case headers that autoMapColumns maps straight back, so an export can
// be edited in Excel and imported again. Gender is never exported.
export const EXPORT_HEADERS = [
  "employee_code",
  "full_name",
  "email",
  "job_title",
  "department",
  "country",
  "currency",
  "salary",
  "employment_type",
  "hire_date",
  "status",
] as const;

export function employeeToCsvRecord(employee: Omit<EmployeeSummary, "id">): string[] {
  return [
    employee.employeeCode,
    employee.fullName,
    employee.email,
    employee.jobTitle,
    employee.department,
    employee.countryCode,
    employee.salary.currency.toUpperCase(),
    toMajorString(employee.salary.amount, employee.salary.currency),
    employee.employmentType,
    employee.hireDate,
    employee.status,
  ];
}

// OWASP CSV injection: spreadsheet apps execute cells starting with these.
const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

export function escapeCsvCell(value: string): string {
  const safe = FORMULA_TRIGGERS.some((t) => value.startsWith(t)) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** Reverses the formula guard so exported values import back unchanged. */
export function unescapeCsvCell(value: string): string {
  return value.startsWith("'") && FORMULA_TRIGGERS.some((t) => value.slice(1).startsWith(t))
    ? value.slice(1)
    : value;
}

/** UTF-8 BOM so Excel detects the encoding; CRLF because that's what Excel writes. */
export function toCsv(headers: readonly string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((cells) => cells.map(escapeCsvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
