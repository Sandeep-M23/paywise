import { Router, type RequestHandler } from "express";
import { importController } from "../../controllers/imports/imports";
import type { ExportService } from "../../services/exports/exports-service";
import type { ImportService } from "../../services/imports/imports-service";
import * as importValidator from "../../validators/imports";

export function importRoutes(
  service: ImportService,
  exports: ExportService,
  verifyAccessToken: RequestHandler,
) {
  const router = Router();
  const controller = importController(service, exports);

  router.get("/", verifyAccessToken, controller.list);

  router.get("/template.csv", verifyAccessToken, controller.template);

  router.get("/:id", verifyAccessToken, controller.get);

  router.post(
    "/preview",
    verifyAccessToken,
    importValidator.validateImportBody,
    controller.preview,
  );

  router.post("/", verifyAccessToken, importValidator.validateImportBody, controller.commit);

  return router;
}
