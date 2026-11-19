import { Hono } from "hono";
import { exportController } from "../../controllers/exports/exports";
import type { ExportService } from "../../services/exports/exports-service";

export function exportRoutes(exports: ExportService) {
  const controller = exportController(exports);
  return new Hono().get("/employees.csv", controller.employees);
}
