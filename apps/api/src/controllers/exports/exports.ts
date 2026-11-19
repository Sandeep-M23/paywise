import type { Request, Response } from "express";
import type { ExportService } from "../../services/exports/exports-service";
import { asyncHandler, sendCsv } from "../../utils/helpers/http-response";
import type { ExportFilters } from "../../validators/exports";

export function exportController(exports: ExportService) {
  return {
    employees: asyncHandler(async (req: Request, res: Response) => {
      const csv = await exports.employeesCsv(req.query as unknown as ExportFilters);
      const date = new Date().toISOString().slice(0, 10);
      sendCsv(res, csv, `paywise-employees-${date}.csv`);
    }, "exportEmployees"),
  };
}
