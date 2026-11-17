"use client";

import { useState } from "react";
import type { ImportPreviewRow, ImportRowStatus } from "@paywise/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { humanize, money } from "@/lib/format";

const PAGE = 100;
const STATUS_LABEL: Record<ImportRowStatus, string> = {
  create: "New",
  update: "Update",
  unchanged: "Unchanged",
  error: "Error",
};

export function PreviewTable({ rows }: { rows: ImportPreviewRow[] }) {
  const hasErrors = rows.some((r) => r.status === "error");
  const [filter, setFilter] = useState<ImportRowStatus | "all">(hasErrors ? "error" : "all");
  const [limit, setLimit] = useState(PAGE);
  const visible = rows.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter rows">
        {(["all", "error", "update", "create", "unchanged"] as const).map((status) => (
          <Button
            key={status}
            size="sm"
            variant={filter === status ? "default" : "outline"}
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
      <Table>
        <TableHeader>
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
                {row.errors?.map((e, i) => (
                  <div key={i}>
                    <span className="font-medium">{humanize(e.field)}:</span> {e.message}
                  </div>
                ))}
                {row.changes?.map((c) => (
                  <div key={c.field}>
                    <span className="font-medium">{humanize(c.field)}:</span>{" "}
                    {c.field === "salary" && row.currency
                      ? `${money(Number(c.from), row.currency)} → ${money(Number(c.to), row.currency)}`
                      : `${c.from} → ${c.to}`}
                  </div>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {visible.length > limit && (
        <Button variant="ghost" onClick={() => setLimit(limit + PAGE)}>
          Show more ({(visible.length - limit).toLocaleString()} remaining)
        </Button>
      )}
    </div>
  );
}
