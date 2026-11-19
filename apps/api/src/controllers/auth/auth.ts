import type { Request, Response } from "express";
import type { AuthService } from "../../services/auth/auth-service";
import { asyncHandler, httpResponse } from "../../utils/helpers/http-response";
import { httpError } from "../../utils/helpers/errors";
import type { LoginPayload } from "../../validators/auth";

export function authController(service: AuthService) {
  return {
    login: asyncHandler(async (req: Request, res: Response) => {
      const { email, password }: LoginPayload = req.body;
      const data = await service.login({ email, password });
      res.json(httpResponse({ message: "Signed in", data }));
    }, "login"),

    me: asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw httpError(401, "unauthenticated", "Please sign in");
      res.json({ email: req.user.email });
    }, "me"),
  };
}
