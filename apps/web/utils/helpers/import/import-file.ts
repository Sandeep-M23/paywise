import Papa from "papaparse";
import {
  IMPORT_FIELDS,
  MAX_IMPORT_ROWS,
  toCsv,
  unescapeCsvCell,
  type ImportField,
  type ImportPreviewRow,
  type ImportRequest,
} from "@paywise/shared";
import type { ParsedFile } from "@/@types";

/**
 * Reads a CSV in the browser. Blank lines are dropped but line numbers are
 * kept, so errors point at the row HR sees in Excel (header = line 1).
 */
export function parseCsvText(text: string): ParsedFile {
  const result = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: false,
    transformHeader: (h) => h.trim(),
  });
  const headers = (result.meta.fields ?? []).filter((h) => h !== "");
  const records = result.data
    .map((values, i) => ({ line: i + 2, values }))
    .filter(({ values }) => Object.values(values).some((v) => (v ?? "").trim() !== ""));
  if (headers.length === 0) throw new Error("The file has no header row.");
  if (records.length === 0) throw new Error("The file has no data rows.");
  if (records.length > MAX_IMPORT_ROWS) {
    throw new Error(
      `The file has ${records.length.toLocaleString()} rows; import at most ${MAX_IMPORT_ROWS.toLocaleString()} at a time.`,
    );
  }
  return { headers, records };
}

/** Applies the column mapping, producing the API request. */
export function buildImportRequest(
  filename: string,
  records: ParsedFile["records"],
  mapping: Record<ImportField, string | null>,
): ImportRequest {
  return {
    filename,
    rows: records.map(({ line, values }) => ({
      line,
      values: Object.fromEntries(
        IMPORT_FIELDS.filter((field) => mapping[field]).map((field) => [
          field,
          unescapeCsvCell(values[mapping[field]!] ?? ""),
        ]),
      ),
    })),
  };
}

/**
 * The rows that failed, exactly as uploaded plus a column explaining what to
 * fix, so HR can correct them in Excel and upload just this file again.
 */
export function errorReportCsv(
  headers: string[],
  records: ParsedFile["records"],
  rows: ImportPreviewRow[],
): string {
  const byLine = new Map(records.map((r) => [r.line, r.values]));
  const failed = rows.filter((r) => r.status === "error");
  return toCsv(
    [...headers, "paywise_errors"],
    failed.map((row) => [
      ...headers.map((h) => byLine.get(row.line)?.[h] ?? ""),
      (row.errors ?? []).map((e) => `${e.field}: ${e.message}`).join("; "),
    ]),
  );
}

export function downloadText(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}
