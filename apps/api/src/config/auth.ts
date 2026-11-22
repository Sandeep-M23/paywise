import type { AuthConfig } from "../interfaces/middlewares/auth";
import { requireEnv } from "./env";

export function authConfigFromEnv(): AuthConfig {
  return {
    email: requireEnv("HR_EMAIL"),
    passwordHash: requireEnv("HR_PASSWORD_HASH"),
    jwtSecret: requireEnv("JWT_ACCESS_SECRET"),
    tokenTtlSeconds: 8 * 60 * 60,
  };
}
