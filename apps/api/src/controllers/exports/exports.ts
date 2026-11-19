import type { Context } from "hono";
import type { ExportService } from "../../services/exports/exports-service";
import { csvResponse } from "../../utils/helpers/http-response";
import { exportFilters } from "../../validators/exports";
import { parseQuery } from "../../validators/validate";

export function exportController(exports: ExportService) {
  return {
    async employees(c: Context) {
      const csv = await exports.employeesCsv(parseQuery(c, exportFilters));
      const date = new Date().toISOString().slice(0, 10);
      return csvResponse(csv, `paywise-employees-${date}.csv`);
    },
  };
}
