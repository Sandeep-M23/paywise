import { Router, type RequestHandler } from "express";
import { authController } from "../../controllers/auth/auth";
import type { AuthService } from "../../services/auth/auth-service";
import * as authValidator from "../../validators/auth";

export function authRoutes(service: AuthService, verifyAccessToken: RequestHandler) {
  const router = Router();
  const controller = authController(service);

  router.post("/login", authValidator.validateLoginBody, controller.login);

  router.get("/me", verifyAccessToken, controller.me);

  return router;
}
