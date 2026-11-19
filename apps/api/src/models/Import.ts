import type { ImportPreviewRow } from "@paywise/shared";
import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const imports = pgTable("imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  rowCount: integer("row_count").notNull(),
  createdCount: integer("created_count").notNull(),
  updatedCount: integer("updated_count").notNull(),
  skippedCount: integer("skipped_count").notNull(),
  status: text("status").notNull().default("committed"),
  // Who ran it (the signed-in HR email) and what each created, updated or skipped
  // row did, so the import log can show its detail. Unchanged rows are left out.
  createdBy: text("created_by"),
  rows: jsonb("rows").$type<ImportPreviewRow[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ImportRow = typeof imports.$inferSelect;
