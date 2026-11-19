import { Hono } from "hono";
import { importController } from "../../controllers/imports/imports";
import type { ImportService } from "../../services/imports/imports-service";
import { limitImportBody } from "../../middlewares/body-limit";
import type { ExportService } from "../../services/exports/exports-service";

export function importRoutes(service: ImportService, exports: ExportService) {
  const controller = importController(service, exports);
  return new Hono<{ Variables: { userEmail?: string } }>()
    .get("/", controller.list)
    .get("/template.csv", controller.template)
    .get("/:id", controller.get)
    .post("/preview", limitImportBody, controller.preview)
    .post("/", limitImportBody, controller.commit);
}
