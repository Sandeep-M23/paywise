import type { Response } from "express";
import type { ValidatedRequest } from "../../interfaces/helpers/http-response";
import type { AuthService } from "../../services/auth/auth-service";
import { asyncHandler, httpResponse } from "../../utils/helpers/http-response";
import { httpError } from "../../utils/helpers/errors";
import type { LoginPayload } from "../../validators/auth";

export function authController(service: AuthService) {
  return {
    login: asyncHandler(async (req: ValidatedRequest<LoginPayload>, res: Response) => {
      const data = await service.login(req.body);
      res.json(httpResponse({ message: "Signed in", data }));
    }, "login"),

    me: asyncHandler(async (req: ValidatedRequest, res: Response) => {
      if (!req.user) throw httpError(401, "unauthenticated", "Please sign in");
      res.json({ email: req.user.email });
    }, "me"),
  };
}
