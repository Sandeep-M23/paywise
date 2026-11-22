import type { Response } from "express";
import type { ValidatedRequest } from "../../interfaces/helpers/http-response";
import type { ExportService } from "../../services/exports/exports-service";
import { asyncHandler, sendCsv } from "../../utils/helpers/http-response";
import type { ExportFilters } from "../../validators/exports";

export function exportController(exports: ExportService) {
  return {
    employees: asyncHandler(
      async (req: ValidatedRequest<unknown, ExportFilters>, res: Response) => {
        const csv = await exports.employeesCsv(req.query);
        const date = new Date().toISOString().slice(0, 10);
        sendCsv(res, csv, `paywise-employees-${date}.csv`);
      },
      "exportEmployees",
    ),
  };
}
