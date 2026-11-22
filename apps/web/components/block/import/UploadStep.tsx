"use client";

import { useState } from "react";
import { IMPORT_FIELD_LABELS, IMPORT_FIELDS, REQUIRED_IMPORT_FIELDS } from "@paywise/shared";
import { Download, FileUp } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDownload } from "@/hooks/useDownload";
import { cn } from "@/lib/utils";
import { ImportLog } from "./ImportLog";

export function UploadStep({ readFile }: { readFile: (file: File) => Promise<void> }) {
  const [dragging, setDragging] = useState(false);
  const download = useDownload();

  return (
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
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void readFile(file);
              }}
            />
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
  );
}
