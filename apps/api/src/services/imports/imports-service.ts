import { randomUUID } from "node:crypto";
import {
  currencyForCountry,
  parseImportRow,
  type EmployeeImportInput,
  type ImportChange,
  type ImportDetail,
  type ImportFieldError,
  type ImportLogEntry,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportRequest,
  type ImportResult,
} from "@paywise/shared";
import { inTransaction, type Db } from "../../config/db";
import type { EmployeeRow, ImportRow } from "../../models";
import type { Clock } from "../../utils/helpers/clock";
import { invalid, mapDbError, notFound } from "../../utils/helpers/errors";
import * as repo from "../employees/employees-repository";
import * as importRepo from "./imports-repository";

const BATCH_SIZE = 1_000;

type PlannedCreate = { line: number; input: EmployeeImportInput };
type PlannedUpdate = {
  line: number;
  existing: EmployeeRow;
  input: EmployeeImportInput;
  changes: ImportChange[];
};
type Plan = { rows: ImportPreviewRow[]; creates: PlannedCreate[]; updates: PlannedUpdate[] };

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

async function plan(db: Db, request: ImportRequest, today: string, lock: boolean): Promise<Plan> {
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

function summarise(rows: ImportPreviewRow[]): ImportPreview["summary"] {
  const summary = { total: rows.length, create: 0, update: 0, unchanged: 0, error: 0 };
  for (const row of rows) summary[row.status] += 1;
  return summary;
}

function chunks<T>(items: T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / BATCH_SIZE) }, (_, i) =>
    items.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
  );
}

function toLogEntry(row: Omit<ImportRow, "rows">): ImportLogEntry {
  return {
    id: row.id,
    filename: row.filename,
    rowCount: row.rowCount,
    createdCount: row.createdCount,
    updatedCount: row.updatedCount,
    skippedCount: row.skippedCount,
    status: row.status as ImportLogEntry["status"],
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createImportService({ db, clock }: { db: Db; clock: Clock }) {
  return {
    async preview(request: ImportRequest): Promise<ImportPreview> {
      const { rows } = await plan(db, request, clock.today(), false);
      return { summary: summarise(rows), rows };
    },

    async commit(request: ImportRequest, { by }: { by?: string } = {}): Promise<ImportResult> {
      const today = clock.today();
      return inTransaction(db, async (tx) => {
        const { rows, creates, updates } = await plan(tx, request, today, true);
        const summary = summarise(rows);
        if (creates.length + updates.length === 0) {
          throw invalid("rows", "Nothing to import: every row is unchanged or has errors");
        }

        const importId = await importRepo.insertImport(tx, {
          filename: request.filename,
          rowCount: summary.total,
          createdCount: summary.create,
          updatedCount: summary.update,
          skippedCount: summary.error,
          createdBy: by ?? null,
          rows: rows.filter((row) => row.status !== "unchanged"),
        });

        const actor = by ?? "system";
        const newEmployees = creates.map(({ input }) => ({
          id: randomUUID(),
          hireRevisionId: randomUUID(),
          ...input,
          gender: input.gender ?? "undisclosed",
          salaryCurrency: currencyForCountry(input.countryCode),
        }));
        for (const batch of chunks(newEmployees)) {
          await importRepo.insertEmployees(
            tx,
            batch.map(({ hireRevisionId, ...e }) => ({
              ...e,
              salaryEffectiveOn: e.hireDate,
              currentRevisionId: hireRevisionId,
              deactivatedAt: null,
              deactivationReason: null,
            })),
          );
          await importRepo.insertRevisions(
            tx,
            batch.map((e) => ({
              id: e.hireRevisionId,
              employeeId: e.id,
              amount: e.salaryAmount,
              currency: e.salaryCurrency,
              effectiveOn: e.hireDate,
              reason: "hire",
              importId,
              createdBy: actor,
            })),
          );
        }

        for (const batch of chunks(updates)) {
          const values = batch.map(({ existing, input }) => ({
            id: existing.id,
            full_name: input.fullName,
            email: input.email,
            job_title: input.jobTitle,
            department: input.department,
            employment_type: input.employmentType,
            hire_date: input.hireDate,
            gender: input.gender ?? existing.gender,
          }));
          await importRepo.updateEmployeesFromImport(tx, values);
        }
        for (const { existing, input, changes } of updates) {
          if (changes.some((c) => c.field === "hireDate")) {
            await repo.moveHireRevision(tx, existing.id, input.hireDate);
          }
        }
        const salaryChanges = updates
          .filter(({ existing, input }) => input.salaryAmount !== existing.salaryAmount)
          .map(({ existing, input }) => ({
            employeeId: existing.id,
            amount: input.salaryAmount,
            currency: existing.salaryCurrency,
            effectiveOn: today,
            reason: "import",
            importId,
            createdBy: actor,
          }));
        for (const batch of chunks(salaryChanges)) {
          await importRepo.insertRevisions(tx, batch);
        }
        await repo.refreshSalaryCache(
          tx,
          today,
          updates.map(({ existing }) => existing.id),
        );

        return {
          importId,
          created: summary.create,
          updated: summary.update,
          unchanged: summary.unchanged,
          skipped: summary.error,
        };
      }).catch(mapDbError);
    },

    async list(): Promise<ImportLogEntry[]> {
      const rows = await importRepo.recentImports(db, 50);
      return rows.map(toLogEntry);
    },

    async get(id: string): Promise<ImportDetail> {
      const row = await importRepo.findImport(db, id);
      if (!row) throw notFound("Import");
      return { ...toLogEntry(row), rows: row.rows };
    },
  };
}

export type ImportService = ReturnType<typeof createImportService>;
