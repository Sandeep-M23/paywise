"use client";

import { useState } from "react";
import { IMPORT_FIELD_LABELS, type ImportPreviewRow, type ImportRowStatus } from "@paywise/shared";
import { Badge } from "@/components/ui/badge";
import { scrollTable, stickyHeader } from "@/utils/constants/table";
import { TableFrame } from "@/components/Shared/TableFrame/TableFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { humanize, money } from "@/utils/helpers/format";

const PAGE = 100;

/** "Hire date (YYYY-MM-DD)" -> "Hire date": the hint belongs on the mapping screen only. */
const fieldLabel = (field: string) =>
  (IMPORT_FIELD_LABELS[field as keyof typeof IMPORT_FIELD_LABELS] ?? humanize(field)).replace(
    / \(.*\)$/,
    "",
  );
const STATUS_LABEL: Record<ImportRowStatus, string> = {
  create: "New",
  update: "Update",
  unchanged: "Unchanged",
  error: "Error",
};

/**
 * Rows of an import, filterable by result. With `getValue`/`onEdit`, error cells
 * become inputs so a bad value can be fixed here and re-checked, no re-upload.
 */
export function PreviewTable({
  rows,
  getValue,
  onEdit,
  maxHeight = "max-h-[32rem]",
}: {
  rows: ImportPreviewRow[];
  /** The raw value in the file for this line and field; undefined if the field isn't mapped. */
  getValue?: (line: number, field: string) => string | undefined;
  onEdit?: (line: number, field: string, value: string) => void;
  maxHeight?: string;
}) {
  const hasErrors = rows.some((r) => r.status === "error");
  const [filter, setFilter] = useState<ImportRowStatus | "all">(hasErrors ? "error" : "all");
  const [limit, setLimit] = useState(PAGE);
  const visible = rows.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="bg-muted flex w-fit flex-wrap gap-1 rounded-lg p-1"
        role="group"
        aria-label="Filter rows"
      >
        {(["all", "error", "update", "create", "unchanged"] as const).map((status) => (
          <Button
            key={status}
            size="sm"
            variant={filter === status ? "default" : "ghost"}
            onClick={() => {
              setFilter(status);
              setLimit(PAGE);
            }}
          >
            {status === "all" ? "All" : STATUS_LABEL[status]} (
            {status === "all" ? rows.length : rows.filter((r) => r.status === status).length})
          </Button>
        ))}
      </div>
      <TableFrame
        footer={
          <>
            <span>
              Showing {Math.min(limit, visible.length).toLocaleString()} of{" "}
              {visible.length.toLocaleString()} rows
              {filter === "all" ? "" : ` · ${STATUS_LABEL[filter].toLowerCase()}`}
            </span>
            {onEdit && <span>Fix a red cell by typing in it, then re-check</span>}
          </>
        }
      >
        <Table containerClassName={scrollTable(maxHeight)}>
          <TableHeader className={stickyHeader}>
            <TableRow>
              <TableHead className="w-16">Line</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead className="w-28">Result</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.slice(0, limit).map((row) => (
              <TableRow key={row.line}>
                <TableCell className="text-muted-foreground tabular-nums">{row.line}</TableCell>
                <TableCell>
                  <span className="font-medium">{row.fullName ?? "–"}</span>
                  <span className="text-muted-foreground ml-2 font-mono text-xs">
                    {row.employeeCode}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.status === "error"
                        ? "destructive"
                        : row.status === "unchanged"
                          ? "outline"
                          : "secondary"
                    }
                  >
                    {STATUS_LABEL[row.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm whitespace-normal">
                  {row.errors?.map((e, i) => {
                    const value = getValue?.(row.line, e.field);
                    return (
                      <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-0.5">
                        <span className="font-medium">{fieldLabel(e.field)}:</span>
                        {onEdit && value !== undefined && (
                          <Input
                            aria-label={`${fieldLabel(e.field)} on line ${row.line}`}
                            defaultValue={value}
                            onBlur={(event) => {
                              if (event.target.value !== value) {
                                onEdit(row.line, e.field, event.target.value);
                              }
                            }}
                            className="h-7 w-48 text-sm"
                          />
                        )}
                        <span className="text-destructive">{e.message}</span>
                      </div>
                    );
                  })}
                  {row.changes?.map((c) => {
                    const show = (v: string | number) =>
                      c.field === "salary" && row.currency
                        ? money(Number(v), row.currency)
                        : String(v);
                    return (
                      <div key={c.field}>
                        <span className="font-medium">{fieldLabel(c.field)}:</span>{" "}
                        <span className="text-muted-foreground line-through">{show(c.from)}</span>
                        {" → "}
                        <span className="font-semibold">{show(c.to)}</span>
                      </div>
                    );
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableFrame>
      {visible.length > limit && (
        <Button variant="ghost" onClick={() => setLimit(limit + PAGE)}>
          Show more ({(visible.length - limit).toLocaleString()} remaining)
        </Button>
      )}
    </div>
  );
}
