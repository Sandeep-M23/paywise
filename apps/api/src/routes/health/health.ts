import { Router, type Request, type Response } from "express";

export function healthRoutes() {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  return router;
}
