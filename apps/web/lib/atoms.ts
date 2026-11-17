import { atom } from "jotai";
import type { ImportField, ImportPreview, ImportResult } from "@paywise/shared";

/*
 * Jotai holds transient UI state. Directory filters live in the URL instead
 * (see use-directory-query.ts) so a filtered view can be shared or reloaded;
 * keeping them in atoms too would mean two sources of truth.
 */

/** Employee shown in the detail panel. */
export const selectedEmployeeIdAtom = atom<string | null>(null);

/** Country selected on the insights page. */
export const insightsCountryAtom = atom<string>("IN");

export type ImportStep = "upload" | "map" | "preview" | "done";

export type ImportWizard = {
  step: ImportStep;
  filename: string;
  headers: string[];
  records: Record<string, string>[];
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
