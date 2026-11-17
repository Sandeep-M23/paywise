"use client";

import { useAtom } from "jotai";
import { useState, type ChangeEvent } from "react";
import { ArrowLeft, CheckCircle2, Download, FileUp, Upload } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  autoMapColumns,
  IMPORT_FIELD_LABELS,
  IMPORT_FIELDS,
  REQUIRED_IMPORT_FIELDS,
  type ImportPreview,
  type ImportResult,
} from "@paywise/shared";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { emptyImportWizard, importWizardAtom } from "@/lib/atoms";
import { buildImportRequest, downloadText, errorReportCsv, parseCsvText } from "@/lib/import-file";
import { useInvalidateEmployeeData } from "@/lib/queries";
import { ImportLog } from "./import-log";
import { PreviewTable } from "./preview-table";

const STEPS = ["Upload", "Match columns", "Review", "Done"] as const;
const NOT_IN_FILE = "__none__";

export function ImportWizard() {
  const [wizard, setWizard] = useAtom(importWizardAtom);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalidate = useInvalidateEmployeeData();
  const stepIndex = ["upload", "map", "preview", "done"].indexOf(wizard.step);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const { headers, records } = parseCsvText(await file.text());
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

  const request = () => buildImportRequest(wizard.filename, wizard.records, wizard.mapping);
  const missing = REQUIRED_IMPORT_FIELDS.filter((field) => !wizard.mapping[field]);

  async function checkRows() {
    setBusy(true);
    setError(null);
    try {
      const preview = await api<ImportPreview>("/imports/preview", {
        method: "POST",
        json: request(),
      });
      setWizard({ ...wizard, step: "preview", preview });
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
      const result = await api<ImportResult>("/imports", { method: "POST", json: request() });
      await invalidate();
      setWizard({ ...wizard, step: "done", result });
      toast.success("Import complete");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Import failed. Nothing was saved.");
    } finally {
      setBusy(false);
    }
  }

  const summary = wizard.preview?.summary;
  const toSave = summary ? summary.create + summary.update : 0;

  return (
    <>
      <PageHeader
        title="Import from CSV"
        description="Bring in data from Excel. Every row is checked before anything is saved."
        actions={
          <Button variant="outline" asChild>
            <a href="/api/imports/template.csv" download>
              <Download className="size-4" aria-hidden /> Template
            </a>
          </Button>
        }
      />

      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Import steps">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === stepIndex ? "step" : undefined}
            className={
              i === stepIndex
                ? "bg-primary text-primary-foreground rounded-full px-3 py-1"
                : i < stepIndex
                  ? "bg-muted rounded-full px-3 py-1"
                  : "text-muted-foreground rounded-full border px-3 py-1"
            }
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {wizard.step === "upload" && (
        <>
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <FileUp className="text-muted-foreground size-10" aria-hidden />
              <div>
                <p className="font-medium">Choose a CSV file</p>
                <p className="text-muted-foreground text-sm">
                  In Excel: File → Save As → “CSV UTF-8”. Up to 10,000 rows. Existing employees are
                  matched by employee code and updated.
                </p>
              </div>
              <Button asChild>
                <label className="cursor-pointer">
                  <Upload className="size-4" aria-hidden /> Select file
                  <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} />
                </label>
              </Button>
            </CardContent>
          </Card>
          <ImportLog />
        </>
      )}

      {wizard.step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle>Match columns</CardTitle>
            <CardDescription>
              {wizard.filename}: {wizard.records.length.toLocaleString()} rows. We matched what we
              could; check each field.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paywise field</TableHead>
                  <TableHead>Column in your file</TableHead>
                  <TableHead>First row</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {IMPORT_FIELDS.map((field) => {
                  const header = wizard.mapping[field];
                  return (
                    <TableRow key={field}>
                      <TableCell className="font-medium">
                        {IMPORT_FIELD_LABELS[field]}
                        {field !== "gender" && !header && (
                          <span className="text-destructive ml-2 text-xs">required</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={header ?? NOT_IN_FILE}
                          onValueChange={(value) =>
                            setWizard({
                              ...wizard,
                              mapping: {
                                ...wizard.mapping,
                                [field]: value === NOT_IN_FILE ? null : value,
                              },
                            })
                          }
                        >
                          <SelectTrigger
                            className="w-56"
                            aria-label={`Column for ${IMPORT_FIELD_LABELS[field]}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NOT_IN_FILE}>Not in file</SelectItem>
                            {wizard.headers.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-56 truncate">
                        {header ? wizard.records[0]?.values[header] : "–"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setWizard(emptyImportWizard)}>
                <ArrowLeft className="size-4" aria-hidden /> Choose another file
              </Button>
              <Button onClick={checkRows} disabled={busy || missing.length > 0}>
                {busy ? "Checking…" : `Check ${wizard.records.length.toLocaleString()} rows`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {wizard.step === "preview" && wizard.preview && summary && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard label="New employees" value={summary.create} />
            <SummaryCard label="Updates" value={summary.update} />
            <SummaryCard label="Unchanged" value={summary.unchanged} />
            <SummaryCard
              label="Errors (will be skipped)"
              value={summary.error}
              tone={summary.error ? "error" : undefined}
            />
          </div>
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Review before importing</CardTitle>
                <CardDescription>Nothing has been saved yet.</CardDescription>
              </div>
              {summary.error > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadText(
                      errorReportCsv(wizard.headers, wizard.records, wizard.preview!.rows),
                      wizard.filename.replace(/\.csv$/i, "") + "-errors.csv",
                    )
                  }
                >
                  <Download className="size-4" aria-hidden /> Download {summary.error} rows to fix
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <PreviewTable rows={wizard.preview.rows} />
            </CardContent>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => setWizard({ ...wizard, step: "map", preview: null })}
            >
              <ArrowLeft className="size-4" aria-hidden /> Back to columns
            </Button>
            <div className="flex items-center gap-3">
              {summary.error > 0 && toSave > 0 && (
                <span className="text-muted-foreground text-sm">
                  {summary.error} row{summary.error === 1 ? "" : "s"} with errors will be skipped.
                </span>
              )}
              <Button onClick={commit} disabled={busy || toSave === 0}>
                {busy
                  ? "Importing…"
                  : toSave === 0
                    ? "Nothing to import"
                    : `Import ${toSave.toLocaleString()} rows`}
              </Button>
            </div>
          </div>
        </>
      )}

      {wizard.step === "done" && wizard.result && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="size-10 text-success" aria-hidden />
            <p className="text-lg font-medium">Import complete</p>
            <p className="text-muted-foreground text-sm">
              {wizard.result.created} added · {wizard.result.updated} updated ·{" "}
              {wizard.result.unchanged} unchanged · {wizard.result.skipped} skipped. Salary changes
              are recorded in each employee&apos;s history.
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/employees">View employees</Link>
              </Button>
              <Button onClick={() => setWizard(emptyImportWizard)}>Import another file</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "error" }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p
          className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "error" ? "text-destructive" : ""}`}
        >
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
