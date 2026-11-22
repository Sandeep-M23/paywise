"use client";

import { ArrowLeft } from "lucide-react";
import type { ImportPreview } from "@paywise/shared";
import { Download } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ImportWizardController } from "@/hooks/useImportWizard";
import { PreviewTable } from "./PreviewTable";

export function ReviewStep({
  preview,
  summary,
  busy,
  edited,
  toSave,
  checkRows,
  commit,
  cellValue,
  editCell,
  downloadErrors,
  backToColumns,
}: { preview: ImportPreview; summary: ImportPreview["summary"] } & Pick<
  ImportWizardController,
  | "busy"
  | "edited"
  | "toSave"
  | "checkRows"
  | "commit"
  | "cellValue"
  | "editCell"
  | "downloadErrors"
  | "backToColumns"
>) {
  return (
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
              <Button variant="outline" size="sm" onClick={downloadErrors}>
                <Download className="size-4" aria-hidden /> Download {summary.error} rows to fix
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <PreviewTable rows={preview.rows} getValue={cellValue} onEdit={editCell} />
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={backToColumns}>
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
