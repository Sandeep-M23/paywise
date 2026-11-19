import { atom } from "jotai";
import type { ImportField, ImportPreview, ImportResult } from "@paywise/shared";
import type { ParsedFile } from "@/utils/helpers/import/import-file";

export type ImportStep = "upload" | "map" | "preview" | "done";

/** Survives navigating away and back, so a half-finished import isn't lost. */

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
