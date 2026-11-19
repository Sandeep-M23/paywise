import type { Request, Response } from "express";
import { z } from "zod";
import type { ImportRequest } from "@paywise/shared";
import type { ExportService } from "../../services/exports/exports-service";
import type { ImportService } from "../../services/imports/imports-service";
import { notFound } from "../../utils/helpers/errors";
import { asyncHandler, sendCsv } from "../../utils/helpers/http-response";

export function importController(service: ImportService, exports: ExportService) {
  return {
    list: asyncHandler(async (_req: Request, res: Response) => {
      res.json(await service.list());
    }, "listImports"),

    template: asyncHandler(async (_req: Request, res: Response) => {
      sendCsv(res, exports.templateCsv(), "paywise-import-template.csv");
    }, "importTemplate"),

    get: asyncHandler(async (req: Request, res: Response) => {
      const id = z.uuid().safeParse(req.params.id);
      if (!id.success) throw notFound("Import");
      res.json(await service.get(id.data));
    }, "getImport"),

    preview: asyncHandler(async (req: Request, res: Response) => {
      const request: ImportRequest = req.body;
      res.json(await service.preview(request));
    }, "previewImport"),

    commit: asyncHandler(async (req: Request, res: Response) => {
      const request: ImportRequest = req.body;
      res.status(201).json(await service.commit(request, { by: req.user?.email }));
    }, "commitImport"),
  };
}
