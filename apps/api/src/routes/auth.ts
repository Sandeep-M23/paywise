import { Hono } from "hono";
import { z } from "zod";
import {
  endSession,
  readSession,
  startSession,
  verifyPassword,
  type AuthConfig,
} from "../lib/auth";
import { AppError } from "../lib/errors";
import { parseBody } from "../lib/validate";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1).max(200),
});

export function authRoutes(config: AuthConfig) {
  return new Hono()
    .post("/login", async (c) => {
      const { email, password } = await parseBody(c, loginSchema);
      // Always run the hash check so timing doesn't reveal whether the email matched.
      const passwordOk = await verifyPassword(password, config.passwordHash);
      if (email !== config.email.toLowerCase() || !passwordOk) {
        throw new AppError(401, "invalid_credentials", "Email or password is incorrect");
      }
      await startSession(c, config, email);
      return c.json({ email });
    })
    .post("/logout", (c) => {
      endSession(c);
      return c.json({ ok: true });
    })
    .get("/me", async (c) => {
      const session = await readSession(c, config);
      if (!session) throw new AppError(401, "unauthenticated", "Please sign in");
      return c.json(session);
    });
}
