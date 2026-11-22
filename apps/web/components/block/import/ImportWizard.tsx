"use client";

import { useAtom, useSetAtom } from "jotai";
import { useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { CheckCircle2, Download, FileUp } from "@/components/icons";
import Link from "next/link";
import { toast } from "sonner";
import {
  autoMapColumns,
  IMPORT_FIELD_LABELS,
  IMPORT_FIELDS,
  REQUIRED_IMPORT_FIELDS,
} from "@paywise/shared";
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
import { ApiError } from "@/utils/services";
import { commitImport, previewImport } from "@/utils/apis/imports";
import { useDownload } from "@/hooks/useDownload";
import { emptyImportWizard, importWizardAtom } from "@/utils/atoms/import";
import {
  buildImportRequest,
  downloadText,
  errorReportCsv,
  parseCsvText,
} from "@/utils/helpers/import/import-file";
import { useInvalidateEmployeeData } from "@/utils/apis/keys";
import { cn } from "@/lib/utils";
import { ImportLog } from "@/components/block/import/ImportLog";
import { PreviewTable } from "@/components/block/import/PreviewTable";
import { TableFrame } from "@/components/shared/TableFrame/TableFrame";

const STEPS = ["Upload", "Match columns", "Review", "Done"] as const;
const NOT_IN_FILE = "__none__";

export function ImportWizard() {
  const setWizard = useSetAtom(importWizardAtom);
  const [visit, setVisit] = useState(0);
  useLayoutEffect(() => {
    setWizard(emptyImportWizard);
    setVisit((n) => n + 1);
  }, [setWizard]);
  return <Wizard key={visit} />;
}

function Wizard() {
  const [wizard, setWizard] = useAtom(importWizardAtom);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const download = useDownload();
  const invalidate = useInvalidateEmployeeData();
  const stepIndex = ["upload", "map", "preview", "done"].indexOf(wizard.step);

  const [dragging, setDragging] = useState(false);
  const [edited, setEdited] = useState(0);

  const onPage = useRef(false);
  useLayoutEffect(() => {
    onPage.current = true;
    return () => {
      onPage.current = false;
    };
  }, []);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await readFile(file);
  }

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

  const request = () => buildImportRequest(wizard.filename, wizard.records, wizard.mapping);
  const missing = REQUIRED_IMPORT_FIELDS.filter((field) => !wizard.mapping[field]);

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

  function editCell(line: number, field: string, value: string) {
    const header = wizard.mapping[field as keyof typeof wizard.mapping];
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
    const header = wizard.mapping[field as keyof typeof wizard.mapping];
    if (!header) return undefined;
    return wizard.records.find((record) => record.line === line)?.values[header] ?? "";
  };

  const summary = wizard.preview?.summary;
  const toSave = summary ? summary.create + summary.update : 0;

  return (
    <>
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Import steps">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === stepIndex ? "step" : undefined}
            className={
              i === stepIndex
                ? "bg-primary text-primary-foreground rounded-md px-3 py-1"
                : i < stepIndex
                  ? "bg-muted rounded-md px-3 py-1"
                  : "text-muted-foreground rounded-md border px-3 py-1"
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
            <CardContent className="grid gap-6 lg:grid-cols-[1fr_20rem]">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) void readFile(file);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                  dragging ? "border-foreground bg-lime/20" : "hover:bg-muted",
                )}
              >
                <span className="bg-lime text-lime-foreground grid size-12 place-items-center rounded-full">
                  <FileUp className="size-6" aria-hidden />
                </span>
                <span className="font-medium">Drop a CSV here, or click to choose</span>
                <span className="text-muted-foreground max-w-md text-sm">
                  In Excel: File → Save As → “CSV UTF-8”. Up to 10,000 rows. Existing employees are
                  matched by employee code and updated; new codes are added.
                </span>
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} />
              </label>
              <div className="flex flex-col gap-3 text-sm">
                <p className="font-semibold">Columns your file needs</p>
                <ul className="flex flex-wrap gap-1.5">
                  {IMPORT_FIELDS.map((field) => (
                    <li
                      key={field}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs",
                        (REQUIRED_IMPORT_FIELDS as readonly string[]).includes(field)
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {IMPORT_FIELD_LABELS[field].replace(/ \(optional\)$/, "")}
                      {(REQUIRED_IMPORT_FIELDS as readonly string[]).includes(field)
                        ? ""
                        : " · optional"}
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground">
                  Names don’t have to match exactly: you’ll match columns in the next step.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => download("/imports/template.csv")}
                >
                  <Download className="size-4" aria-hidden /> Download a sample file
                </Button>
              </div>
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
            <TableFrame
              footer={`${IMPORT_FIELDS.length} Paywise fields · ${wizard.headers.length} columns in your file`}
            >
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
            </TableFrame>
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
                <CardDescription>
                  Nothing has been saved yet.
                  {summary.error > 0 && " Fix a bad value right in the table, then re-check."}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {edited > 0 && (
                  <Button size="sm" onClick={checkRows} disabled={busy}>
                    {busy ? "Checking…" : `Re-check with ${edited} fix${edited === 1 ? "" : "es"}`}
                  </Button>
                )}
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
              </div>
            </CardHeader>
            <CardContent>
              <PreviewTable rows={wizard.preview.rows} getValue={cellValue} onEdit={editCell} />
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
              <Button onClick={commit} disabled={busy || toSave === 0 || edited > 0}>
                {busy
                  ? "Importing…"
                  : edited > 0
                    ? "Re-check your fixes first"
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
