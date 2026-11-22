import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Clock } from "../utils/helpers/clock";

export function promoteDueRevisionsDaily({
  clock,
  promote,
}: {
  clock: Clock;
  promote: () => Promise<{ promoted: number }>;
}): RequestHandler {
  let doneFor: string | null = null;
  let running: Promise<void> | null = null;

  return async (_req: Request, _res: Response, next: NextFunction) => {
    const today = clock.today();
    if (doneFor === today) return next();
    try {
      running ??= promote()
        .then(() => {
          doneFor = today;
        })
        .finally(() => {
          running = null;
        });
      await running;
      next();
    } catch (error) {
      next(error);
    }
  };
}
