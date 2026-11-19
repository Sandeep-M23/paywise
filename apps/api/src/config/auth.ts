import type { AuthConfig } from "../interfaces/middlewares/auth";
import { requireEnv } from "./env";

export function authConfigFromEnv(): AuthConfig {
  return {
    email: requireEnv("HR_EMAIL"),
    passwordHash: requireEnv("HR_PASSWORD_HASH"),
    sessionSecret: requireEnv("SESSION_SECRET"),
    secureCookies: process.env.NODE_ENV === "production",
    sessionTtlSeconds: 8 * 60 * 60, // a working day
  };
}
