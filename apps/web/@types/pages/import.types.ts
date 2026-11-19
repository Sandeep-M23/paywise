import type { ImportField, ImportPreview, ImportResult } from "@paywise/shared";

export type ParsedFile = {
  headers: string[];
  records: { line: number; values: Record<string, string> }[];
};

export type ImportStep = "upload" | "map" | "preview" | "done";

export type ImportWizardState = {
  step: ImportStep;
  filename: string;
  headers: string[];
  records: ParsedFile["records"];
  mapping: Record<ImportField, string | null>;
  preview: ImportPreview | null;
  result: ImportResult | null;
};
