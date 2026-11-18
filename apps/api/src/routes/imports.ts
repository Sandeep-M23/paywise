import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { employeeListQuerySchema, importRequestSchema } from "@paywise/shared";
import type { ImportService } from "../services/imports";
import type { ExportService } from "../services/exports";
import { z } from "zod";
import { AppError, notFound } from "../lib/errors";
import { parseBody, parseQuery } from "../lib/validate";

// Vercel Functions reject request bodies over 4.5 MB; fail early with a clear message.
export const MAX_IMPORT_BODY_BYTES = 4_400_000;

const limitImportBody = bodyLimit({
  maxSize: MAX_IMPORT_BODY_BYTES,
  onError: () => {
    throw new AppError(413, "import_too_large", "File is too large; split it into smaller files");
  },
});

const csvResponse = (csv: string, filename: string) =>
  new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });

export function importRoutes(service: ImportService, exports: ExportService) {
  return new Hono<{ Variables: { userEmail?: string } }>()
    .get("/", async (c) => c.json(await service.list()))
    .get("/template.csv", () => csvResponse(exports.templateCsv(), "paywise-import-template.csv"))
    .get("/:id", async (c) => {
      const id = z.uuid().safeParse(c.req.param("id"));
      if (!id.success) throw notFound("Import");
      return c.json(await service.get(id.data));
    })
    .post("/preview", limitImportBody, async (c) =>
      c.json(await service.preview(await parseBody(c, importRequestSchema))),
    )
    .post("/", limitImportBody, async (c) =>
      c.json(
        await service.commit(await parseBody(c, importRequestSchema), { by: c.get("userEmail") }),
        201,
      ),
    );
}

export function exportRoutes(exports: ExportService) {
  const filters = employeeListQuerySchema.pick({
    status: true,
    country: true,
    jobTitle: true,
    department: true,
    q: true,
  });
  return new Hono().get("/employees.csv", async (c) => {
    const csv = await exports.employeesCsv(parseQuery(c, filters));
    const date = new Date().toISOString().slice(0, 10);
    return csvResponse(csv, `paywise-employees-${date}.csv`);
  });
}
