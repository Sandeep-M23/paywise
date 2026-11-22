import type { NextFunction, Request, Response } from "express";
import type { ResponseObject, ResponsePayload } from "../../interfaces/helpers/http-response";

export const asyncHandler =
  (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
    controllerName: string,
  ) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      if (error && typeof error === "object") {
        (error as { controller?: string }).controller = controllerName;
      }
      next(error);
    }
  };

export const httpResponse = <T>({
  status = 200,
  message = "Success",
  data,
}: ResponsePayload<T>): ResponseObject<T> => ({ status, message, data });

export const sendCsv = (res: Response, csv: string, filename: string) =>
  res
    .status(200)
    .set({
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    })
    .send(csv);
