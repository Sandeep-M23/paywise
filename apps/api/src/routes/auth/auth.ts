import { Hono } from "hono";
import { authController } from "../../controllers/auth/auth";
import type { AuthConfig } from "../../interfaces/middlewares/auth";

export function authRoutes(config: AuthConfig) {
  const controller = authController(config);
  return new Hono()
    .post("/login", controller.login)
    .post("/logout", controller.logout)
    .get("/me", controller.me);
}
