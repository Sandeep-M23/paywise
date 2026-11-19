import { atom } from "jotai";
import type { ImportWizardState } from "@/@types";

export const emptyImportWizard: ImportWizardState = {
  step: "upload",
  filename: "",
  headers: [],
  records: [],
  mapping: {} as ImportWizardState["mapping"],
  preview: null,
  result: null,
};

export const importWizardAtom = atom<ImportWizardState>(emptyImportWizard);
