import { Router, type RequestHandler } from "express";
import { exportController } from "../../controllers/exports/exports";
import type { ExportService } from "../../services/exports/exports-service";
import * as exportValidator from "../../validators/exports";

export function exportRoutes(exports: ExportService, verifyAccessToken: RequestHandler) {
  const router = Router();
  const controller = exportController(exports);

  router.get(
    "/employees.csv",
    verifyAccessToken,
    exportValidator.validateExportQuery,
    controller.employees,
  );

  return router;
}
