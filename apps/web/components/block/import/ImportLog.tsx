"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, History } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useImportDetail, useImportLog } from "@/utils/apis/imports";
import { PreviewTable } from "@/components/block/import/PreviewTable";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** Past imports, newest first; open one to see who ran it and what each row did. */
export function ImportLog() {
  const { data, isLoading } = useImportLog();
  const [openId, setOpenId] = useState<string | null>(null);
  const totals = (data ?? []).reduce(
    (sum, e) => ({ added: sum.added + e.createdCount, updated: sum.updated + e.updatedCount }),
    { added: 0, updated: 0 },
  );
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            Previous imports
            {data && data.length > 0 && (
              <Badge variant="secondary" className="tabular-nums">
                {data.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="mt-1">
            Open one to see exactly what it added and changed.
          </CardDescription>
        </div>
        {data && data.length > 0 && (
          <div className="text-muted-foreground flex gap-4 text-sm">
            <span>
              <span className="text-foreground font-semibold tabular-nums">
                {totals.added.toLocaleString()}
              </span>{" "}
              added
            </span>
            <span>
              <span className="text-foreground font-semibold tabular-nums">
                {totals.updated.toLocaleString()}
              </span>{" "}
              updated
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-16 w-full" />}
        {data?.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center text-sm">
            <History className="size-6 opacity-60" aria-hidden />
            No imports yet. Your first upload will appear here.
          </div>
        )}
        {data && data.length > 0 && (
          <ul className="-m-1 flex max-h-96 flex-col gap-2 overflow-y-auto p-1">
            {data.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(entry.id)}
                  className="hover:bg-muted focus-visible:ring-ring/50 group flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-3 text-left outline-none focus-visible:ring-3"
                >
                  <span className="bg-muted text-muted-foreground group-hover:bg-card grid size-10 shrink-0 place-items-center rounded-lg">
                    <FileText className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{entry.filename}</span>
                      {entry.status === "reverted" && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Reverted
                        </Badge>
                      )}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {when(entry.createdAt)}
                      {entry.createdBy ? ` · by ${entry.createdBy}` : ""} ·{" "}
                      {entry.rowCount.toLocaleString()} {entry.rowCount === 1 ? "row" : "rows"}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold tabular-nums">
                    <Count value={entry.createdCount} label="added" tone="success" />
                    <Count value={entry.updatedCount} label="updated" />
                    <Count value={entry.skippedCount} label="skipped" tone="warning" />
                  </span>
                  <ChevronRight
                    className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ImportDetailSheet id={openId} onClose={() => setOpenId(null)} />
    </Card>
  );
}

/** A count pill; zero stays grey so the numbers that matter stand out. */
function Count({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "rounded-md px-2.5 py-1",
        value === 0 || !tone
          ? "bg-muted text-muted-foreground"
          : tone === "success"
            ? "bg-success/12 text-success"
            : "bg-warning/12 text-warning",
        value > 0 && !tone && "text-foreground",
      )}
    >
      {value.toLocaleString()} {label}
    </span>
  );
}

function ImportDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useImportDetail(id);
  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{data?.filename ?? "Import"}</SheetTitle>
          <SheetDescription>
            {data
              ? `${when(data.createdAt)}${data.createdBy ? ` · by ${data.createdBy}` : ""} · ${data.createdCount} added, ${data.updatedCount} updated, ${data.skippedCount} skipped`
              : " "}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
          {isLoading && <Skeleton className="h-64 w-full" />}
          {data && data.rows.length === 0 && (
            <p className="text-muted-foreground text-sm">
              This import was made before row details were recorded.
            </p>
          )}
          {data && data.rows.length > 0 && (
            <PreviewTable rows={data.rows} maxHeight="max-h-[calc(100dvh-12rem)]" />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
