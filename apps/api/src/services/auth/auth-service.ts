import type { AuthConfig } from "../../interfaces/middlewares/auth";
import { generateToken, verifyHashedPassword } from "../../utils/auth/auth-utils";
import { httpError } from "../../utils/helpers/errors";

export function createAuthService(config: AuthConfig) {
  return {
    async login({ email, password }: { email: string; password: string }) {
      const passwordOk = await verifyHashedPassword(password, config.passwordHash);
      if (email !== config.email.toLowerCase() || !passwordOk) {
        throw httpError(401, "invalid_credentials", "Email or password is incorrect");
      }
      return { authToken: generateToken({ email }, config), email };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
