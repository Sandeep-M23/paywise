import { employeeListQuerySchema } from "@paywise/shared";
import type { z } from "zod";
import { validateQuery } from "./validate";

// The directory's filters, without paging or sort: an export is every matching row.
export const exportFilters = employeeListQuerySchema.pick({
  status: true,
  country: true,
  jobTitle: true,
  department: true,
  q: true,
});

export type ExportFilters = z.infer<typeof exportFilters>;

export const validateExportQuery = validateQuery(exportFilters);
