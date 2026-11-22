import { randomUUID } from "node:crypto";
import {
  currencyForCountry,
  type ImportDetail,
  type ImportLogEntry,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportRequest,
  type ImportResult,
} from "@paywise/shared";
import { inTransaction, type Db } from "../../config/db";
import type { ImportRow } from "../../models";
import type { Clock } from "../../utils/helpers/clock";
import { invalid, mapDbError, notFound } from "../../utils/helpers/errors";
import * as revisions from "../employees/salary-revisions-repository";
import * as importRepo from "./imports-repository";

const BATCH_SIZE = 1_000;

import { plan } from "./imports-plan";

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
            await revisions.moveHireRevision(tx, existing.id, input.hireDate);
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
        await revisions.refreshSalaryCache(
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
