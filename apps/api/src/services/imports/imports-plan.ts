import {
  currencyForCountry,
  parseImportRow,
  type EmployeeImportInput,
  type ImportChange,
  type ImportFieldError,
  type ImportPreviewRow,
  type ImportRequest,
} from "@paywise/shared";
import { type Db } from "../../config/db";
import type { EmployeeRow } from "../../models";
import * as importRepo from "./imports-repository";

type PlannedCreate = { line: number; input: EmployeeImportInput };
type PlannedUpdate = {
  line: number;
  existing: EmployeeRow;
  input: EmployeeImportInput;
  changes: ImportChange[];
};
export type Plan = { rows: ImportPreviewRow[]; creates: PlannedCreate[]; updates: PlannedUpdate[] };

const COMPARED_FIELDS = [
  "fullName",
  "email",
  "jobTitle",
  "department",
  "employmentType",
  "hireDate",
] as const;

function diff(existing: EmployeeRow, input: EmployeeImportInput): ImportChange[] {
  const changes: ImportChange[] = COMPARED_FIELDS.filter(
    (field) => existing[field] !== input[field],
  ).map((field) => ({ field, from: existing[field], to: input[field] }));
  if (input.gender && input.gender !== existing.gender) {
    changes.push({ field: "gender", from: existing.gender, to: input.gender });
  }
  if (input.salaryAmount !== existing.salaryAmount) {
    changes.push({ field: "salary", from: existing.salaryAmount, to: input.salaryAmount });
  }
  return changes;
}

export async function plan(
  db: Db,
  request: ImportRequest,
  today: string,
  lock: boolean,
): Promise<Plan> {
  const parsed = request.rows.map(({ line, values }) => ({
    line,
    values,
    result: parseImportRow(values),
  }));

  const firstLineByCode = new Map<string, number>();
  const firstLineByEmail = new Map<string, number>();
  const fileErrors = new Map<number, ImportFieldError[]>();
  for (const { line, result } of parsed) {
    if (!result.ok) continue;
    const { employeeCode, email } = result.value;
    const codeLine = firstLineByCode.get(employeeCode);
    const emailLine = firstLineByEmail.get(email);
    if (codeLine) {
      fileErrors.set(line, [
        { field: "employeeCode", message: `Duplicate of line ${codeLine} in this file` },
      ]);
    } else if (emailLine) {
      fileErrors.set(line, [
        { field: "email", message: `Duplicate of line ${emailLine} in this file` },
      ]);
    } else {
      firstLineByCode.set(employeeCode, line);
      firstLineByEmail.set(email, line);
    }
  }

  const codes = [...firstLineByCode.keys()];
  const emails = [...firstLineByEmail.keys()];
  const existingRows = await importRepo.employeesByCodes(db, codes, { lock });
  const byCode = new Map(existingRows.map((row) => [row.employeeCode, row]));

  const owners = await importRepo.emailOwners(db, emails);
  const ownerByEmail = new Map(owners.map((o) => [o.email, o.code]));

  const ids = existingRows.map((r) => r.id);
  const earliest = await importRepo.earliestChanges(db, ids);
  const earliestChangeById = new Map(earliest.map((e) => [e.employeeId, e.date]));

  const changedToday = await importRepo.employeesChangedOn(db, ids, today);
  const hasChangeToday = new Set(changedToday.map((r) => r.employeeId));

  const result: Plan = { rows: [], creates: [], updates: [] };
  for (const { line, values, result: parsedRow } of parsed) {
    const errorRow = (errors: ImportFieldError[]): ImportPreviewRow => ({
      line,
      employeeCode: values.employeeCode?.trim() || null,
      fullName: values.fullName?.trim() || null,
      status: "error",
      errors,
    });

    if (!parsedRow.ok) {
      result.rows.push(errorRow(parsedRow.errors));
      continue;
    }
    if (fileErrors.has(line)) {
      result.rows.push(errorRow(fileErrors.get(line)!));
      continue;
    }

    const input = parsedRow.value;
    const existing = byCode.get(input.employeeCode);
    const emailOwner = ownerByEmail.get(input.email);
    const errors: ImportFieldError[] = [];
    if (emailOwner && emailOwner !== input.employeeCode) {
      errors.push({ field: "email", message: `Email already belongs to ${emailOwner}` });
    }
    if (input.hireDate > today) {
      errors.push({ field: "hireDate", message: "Hire date cannot be in the future" });
    }

    const base = {
      line,
      employeeCode: input.employeeCode,
      fullName: input.fullName,
      currency: currencyForCountry(input.countryCode),
    };

    if (!existing) {
      if (errors.length) result.rows.push(errorRow(errors));
      else {
        result.rows.push({ ...base, status: "create" });
        result.creates.push({ line, input });
      }
      continue;
    }

    if (existing.countryCode !== input.countryCode) {
      errors.push({
        field: "countryCode",
        message: `Country can't change (${existing.countryCode} → ${input.countryCode}); relocation isn't supported`,
      });
    }
    if (existing.status === "inactive") {
      errors.push({ field: "employeeCode", message: `${input.employeeCode} is inactive` });
    }
    const earliestChange = earliestChangeById.get(existing.id);
    if (
      input.hireDate !== existing.hireDate &&
      earliestChange &&
      input.hireDate >= earliestChange
    ) {
      errors.push({
        field: "hireDate",
        message: `Hire date must be before the first salary change (${earliestChange})`,
      });
    }
    if (input.salaryAmount !== existing.salaryAmount && hasChangeToday.has(existing.id)) {
      errors.push({
        field: "salary",
        message: "Already has a salary change dated today; change it in Paywise instead",
      });
    }

    if (errors.length) {
      result.rows.push(errorRow(errors));
      continue;
    }
    const changes = diff(existing, input);
    if (changes.length === 0) {
      result.rows.push({ ...base, status: "unchanged" });
    } else {
      result.rows.push({ ...base, status: "update", changes });
      result.updates.push({ line, existing, input, changes });
    }
  }
  return result;
}
