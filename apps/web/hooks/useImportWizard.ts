"use client";

import { useAtom } from "jotai";
import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { autoMapColumns, REQUIRED_IMPORT_FIELDS, type ImportField } from "@paywise/shared";
import { commitImport, previewImport } from "@/utils/apis/imports";
import { useInvalidateEmployeeData } from "@/utils/apis/keys";
import { emptyImportWizard, importWizardAtom } from "@/utils/atoms/import";
import {
  buildImportRequest,
  downloadText,
  errorReportCsv,
  parseCsvText,
} from "@/utils/helpers/import/import-file";
import { ApiError } from "@/utils/services";

export function useImportWizard() {
  const [wizard, setWizard] = useAtom(importWizardAtom);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edited, setEdited] = useState(0);
  const invalidate = useInvalidateEmployeeData();

  const onPage = useRef(false);
  useLayoutEffect(() => {
    onPage.current = true;
    return () => {
      onPage.current = false;
    };
  }, []);

  const request = () => buildImportRequest(wizard.filename, wizard.records, wizard.mapping);
  const missing = REQUIRED_IMPORT_FIELDS.filter((field) => !wizard.mapping[field]);
  const summary = wizard.preview?.summary;
  const toSave = summary ? summary.create + summary.update : 0;

  async function readFile(file: File) {
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setError("That isn't a CSV file. In Excel: File → Save As → “CSV UTF-8”.");
      return;
    }
    setError(null);
    setEdited(0);
    try {
      const { headers, records } = parseCsvText(await file.text());
      if (!onPage.current) return;
      setWizard({
        ...emptyImportWizard,
        step: "map",
        filename: file.name,
        headers,
        records,
        mapping: autoMapColumns(headers),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file.");
    }
  }

  async function checkRows() {
    setBusy(true);
    setError(null);
    try {
      const preview = await previewImport(request());
      if (!onPage.current) return;
      setWizard({ ...wizard, step: "preview", preview });
      setEdited(0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not check the file.");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    setBusy(true);
    setError(null);
    try {
      const result = await commitImport(request());
      await invalidate();
      toast.success("Import complete");
      if (onPage.current) {
        setWizard({ ...wizard, step: "done", result, preview: null, records: [] });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Import failed. Nothing was saved.");
    } finally {
      setBusy(false);
    }
  }

  function setMapping(field: ImportField, header: string | null) {
    setWizard({ ...wizard, mapping: { ...wizard.mapping, [field]: header } });
  }

  function editCell(line: number, field: string, value: string) {
    const header = wizard.mapping[field as ImportField];
    if (!header) return;
    setWizard({
      ...wizard,
      records: wizard.records.map((record) =>
        record.line === line
          ? { ...record, values: { ...record.values, [header]: value } }
          : record,
      ),
    });
    setEdited((n) => n + 1);
  }

  const cellValue = (line: number, field: string) => {
    const header = wizard.mapping[field as ImportField];
    if (!header) return undefined;
    return wizard.records.find((record) => record.line === line)?.values[header] ?? "";
  };

  const downloadErrors = () => {
    if (!wizard.preview) return;
    downloadText(
      errorReportCsv(wizard.headers, wizard.records, wizard.preview.rows),
      wizard.filename.replace(/\.csv$/i, "") + "-errors.csv",
    );
  };

  return {
    wizard,
    busy,
    error,
    edited,
    missing,
    summary,
    toSave,
    readFile,
    checkRows,
    commit,
    setMapping,
    editCell,
    cellValue,
    downloadErrors,
    reset: () => setWizard(emptyImportWizard),
    backToColumns: () => setWizard({ ...wizard, step: "map", preview: null }),
  };
}

export type ImportWizardController = ReturnType<typeof useImportWizard>;
