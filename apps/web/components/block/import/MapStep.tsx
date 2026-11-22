"use client";

import { ArrowLeft } from "lucide-react";
import { IMPORT_FIELD_LABELS, IMPORT_FIELDS } from "@paywise/shared";
import { TableFrame } from "@/components/shared/TableFrame/TableFrame";
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
import type { ImportWizardController } from "@/hooks/useImportWizard";

const NOT_IN_FILE = "__none__";

export function MapStep({
  wizard,
  busy,
  missing,
  setMapping,
  checkRows,
  reset,
}: Pick<
  ImportWizardController,
  "wizard" | "busy" | "missing" | "setMapping" | "checkRows" | "reset"
>) {
  return (
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
                          setMapping(field, value === NOT_IN_FILE ? null : value)
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
          <Button variant="ghost" onClick={reset}>
            <ArrowLeft className="size-4" aria-hidden /> Choose another file
          </Button>
          <Button onClick={checkRows} disabled={busy || missing.length > 0}>
            {busy ? "Checking…" : `Check ${wizard.records.length.toLocaleString()} rows`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
