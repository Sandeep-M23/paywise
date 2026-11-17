"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useImportLog } from "@/lib/queries";

export function ImportLog() {
  const { data } = useImportLog();
  if (!data?.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Previous imports</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>File</TableHead>
              <TableHead className="text-right">Rows</TableHead>
              <TableHead className="text-right">Added</TableHead>
              <TableHead className="text-right">Updated</TableHead>
              <TableHead className="text-right">Skipped</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                <TableCell>{entry.filename}</TableCell>
                <TableCell className="text-right tabular-nums">{entry.rowCount}</TableCell>
                <TableCell className="text-right tabular-nums">{entry.createdCount}</TableCell>
                <TableCell className="text-right tabular-nums">{entry.updatedCount}</TableCell>
                <TableCell className="text-right tabular-nums">{entry.skippedCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
