import type { Context } from "hono";
import type { ImportContext } from "../../interfaces/controllers/imports";
import { z } from "zod";
import { importRequestSchema } from "@paywise/shared";
import type { ExportService } from "../../services/exports/exports-service";
import { csvResponse } from "../../utils/helpers/http-response";
import { notFound } from "../../utils/helpers/errors";
import { parseBody } from "../../validators/validate";
import type { ImportService } from "../../services/imports/imports-service";

export function importController(service: ImportService, exports: ExportService) {
  return {
    async list(c: Context) {
      return c.json(await service.list());
    },

    template() {
      return csvResponse(exports.templateCsv(), "paywise-import-template.csv");
    },

    async get(c: Context) {
      const id = z.uuid().safeParse(c.req.param("id"));
      if (!id.success) throw notFound("Import");
      return c.json(await service.get(id.data));
    },

    async preview(c: Context) {
      return c.json(await service.preview(await parseBody(c, importRequestSchema)));
    },

    async commit(c: ImportContext) {
      const request = await parseBody(c, importRequestSchema);
      return c.json(await service.commit(request, { by: c.get("userEmail") }), 201);
    },
  };
}
