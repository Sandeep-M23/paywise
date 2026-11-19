import type { ParsedFile } from "@/lib/import-file";
import type { ImportField, ImportPreview, ImportResult } from "@paywise/shared";
import { atom } from "jotai";

export type ImportStep = "upload" | "map" | "preview" | "done";

export type ImportWizard = {
  step: ImportStep;
  filename: string;
  headers: string[];
  records: ParsedFile["records"];
  mapping: Record<ImportField, string | null>;
  preview: ImportPreview | null;
  result: ImportResult | null;
};

export const emptyImportWizard: ImportWizard = {
  step: "upload",
  filename: "",
  headers: [],
  records: [],
  mapping: {} as ImportWizard["mapping"],
  preview: null,
  result: null,
};

export const importWizardAtom = atom<ImportWizard>(emptyImportWizard);
