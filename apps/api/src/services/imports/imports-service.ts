import { randomUUID } from "node:crypto";
import { and, desc, eq, getTableColumns, inArray, min, ne, sql } from "drizzle-orm";
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
import type { Db } from "../../config/db";
import {
  employees,
  imports,
  salaryRevisions,
  type EmployeeRow,
  type ImportRow,
} from "../../models";
import type { Clock } from "../../utils/helpers/clock";
import { invalid, mapDbError, notFound } from "../../utils/helpers/errors";
import * as repo from "../employees/employees-repository";

/*
 * CSV import in two steps. Preview classifies every row (create / update /
 * unchanged / error) and saves nothing. Commit re-runs the same planning
 * inside a transaction, never trusting the earlier preview, then writes all
 * valid rows at once. Error rows are skipped: the user has seen them in the
 * preview and chose to continue. See docs/DESIGN.md "CSV import".
 */

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

  // Duplicates inside the file: the first occurrence wins, later ones are errors.
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

  // Set-based lookups: three queries for the whole file, not per row.
  const codes = [...firstLineByCode.keys()];
  const emails = [...firstLineByEmail.keys()];
  const existingQuery = codes.length
    ? db.select().from(employees).where(inArray(employees.employeeCode, codes))
    : null;
  const existingRows = existingQuery
    ? await (lock ? existingQuery.for("update") : existingQuery)
    : [];
  const byCode = new Map(existingRows.map((row) => [row.employeeCode, row]));

  const emailOwners = emails.length
    ? await db
        .select({ code: employees.employeeCode, email: sql<string>`lower(${employees.email})` })
        .from(employees)
        .where(inArray(sql`lower(${employees.email})`, emails))
    : [];
  const ownerByEmail = new Map(emailOwners.map((o) => [o.email, o.code]));

  const earliestChanges = existingRows.length
    ? await db
        .select({ employeeId: salaryRevisions.employeeId, date: min(salaryRevisions.effectiveOn) })
        .from(salaryRevisions)
        .where(
          and(
            inArray(
              salaryRevisions.employeeId,
              existingRows.map((r) => r.id),
            ),
            ne(salaryRevisions.reason, "hire"),
          ),
        )
        .groupBy(salaryRevisions.employeeId)
    : [];
  const earliestChangeById = new Map(earliestChanges.map((e) => [e.employeeId, e.date]));

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
    if (input.hireDate !== existing.hireDate && earliestChange && input.hireDate > earliestChange) {
      errors.push({
        field: "hireDate",
        message: `Hire date cannot be after the first salary change (${earliestChange})`,
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
      return db
        .transaction(async (tx) => {
          const { rows, creates, updates } = await plan(tx, request, today, true);
          const summary = summarise(rows);
          if (creates.length + updates.length === 0) {
            throw invalid("rows", "Nothing to import: every row is unchanged or has errors");
          }

          const [log] = await tx
            .insert(imports)
            .values({
              filename: request.filename,
              rowCount: summary.total,
              createdCount: summary.create,
              updatedCount: summary.update,
              skippedCount: summary.error,
              createdBy: by ?? null,
              rows: rows.filter((row) => row.status !== "unchanged"),
            })
            .returning({ id: imports.id });
          const importId = log!.id;

          const newEmployees = creates.map(({ input }) => ({
            id: randomUUID(),
            ...input,
            gender: input.gender ?? "undisclosed",
            salaryCurrency: currencyForCountry(input.countryCode),
          }));
          for (const batch of chunks(newEmployees)) {
            await tx.insert(employees).values(batch);
            await tx.insert(salaryRevisions).values(
              batch.map((e) => ({
                employeeId: e.id,
                amount: e.salaryAmount,
                previousAmount: null,
                currency: e.salaryCurrency,
                effectiveOn: e.hireDate,
                reason: "hire",
                importId,
              })),
            );
          }

          // One UPDATE ... FROM (VALUES ...) per batch instead of one per row:
          // round trips dominate once the database is across a network.
          for (const batch of chunks(updates)) {
            const rows = batch.map(({ existing, input }) => {
              const gender = input.gender ?? existing.gender;
              return sql`(${existing.id}::uuid, ${input.fullName}, ${input.email}, ${input.jobTitle},
                ${input.department}, ${input.employmentType}, ${input.hireDate}::date, ${gender},
                ${input.salaryAmount}::bigint)`;
            });
            await tx.execute(sql`
              UPDATE ${employees} AS e SET
                full_name = v.full_name, email = v.email, job_title = v.job_title,
                department = v.department, employment_type = v.employment_type,
                hire_date = v.hire_date, gender = v.gender, salary_amount = v.salary_amount,
                updated_at = now()
              FROM (VALUES ${sql.join(rows, sql`, `)}) AS v(id, full_name, email, job_title,
                department, employment_type, hire_date, gender, salary_amount)
              WHERE e.id = v.id
            `);
          }
          for (const { existing, input, changes } of updates) {
            // Rare (a corrected hire date), so per row is fine.
            if (changes.some((c) => c.field === "hireDate")) {
              await repo.moveHireRevision(tx, existing.id, input.hireDate);
            }
          }
          const salaryChanges = updates
            .filter(({ existing, input }) => input.salaryAmount !== existing.salaryAmount)
            .map(({ existing, input }) => ({
              employeeId: existing.id,
              amount: input.salaryAmount,
              previousAmount: existing.salaryAmount,
              currency: existing.salaryCurrency,
              effectiveOn: today,
              reason: "import",
              importId,
            }));
          for (const batch of chunks(salaryChanges)) {
            await tx.insert(salaryRevisions).values(batch);
          }

          return {
            importId,
            created: summary.create,
            updated: summary.update,
            unchanged: summary.unchanged,
            skipped: summary.error,
          };
        })
        .catch(mapDbError);
    },

    async list(): Promise<ImportLogEntry[]> {
      // The per-row record can be large; the list doesn't need it.
      const { rows: _rows, ...columns } = getTableColumns(imports);
      const rows = await db
        .select(columns)
        .from(imports)
        .orderBy(desc(imports.createdAt))
        .limit(50);
      return rows.map(toLogEntry);
    },

    async get(id: string): Promise<ImportDetail> {
      const [row] = await db.select().from(imports).where(eq(imports.id, id));
      if (!row) throw notFound("Import");
      return { ...toLogEntry(row), rows: row.rows };
    },
  };
}

export type ImportService = ReturnType<typeof createImportService>;
