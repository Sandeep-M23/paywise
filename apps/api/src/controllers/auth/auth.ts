import type { Context } from "hono";
import { endSession, readSession, startSession, verifyPassword } from "../../middlewares/auth";
import type { AuthConfig } from "../../interfaces/middlewares/auth";
import { AppError } from "../../utils/helpers/errors";
import { loginSchema } from "../../validators/auth";
import { parseBody } from "../../validators/validate";

export function authController(config: AuthConfig) {
  return {
    async login(c: Context) {
      const { email, password } = await parseBody(c, loginSchema);
      // Always run the hash check so timing doesn't reveal whether the email matched.
      const passwordOk = await verifyPassword(password, config.passwordHash);
      if (email !== config.email.toLowerCase() || !passwordOk) {
        throw new AppError(401, "invalid_credentials", "Email or password is incorrect");
      }
      await startSession(c, config, email);
      return c.json({ email });
    },

    logout(c: Context) {
      endSession(c);
      return c.json({ ok: true });
    },

    async me(c: Context) {
      const session = await readSession(c, config);
      if (!session) throw new AppError(401, "unauthenticated", "Please sign in");
      return c.json(session);
    },
  };
}
