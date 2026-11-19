export type AuthConfig = {
  email: string;
  /** "scrypt$<salt b64>$<hash b64>", from `npm run hash-password`. */
  passwordHash: string;
  jwtSecret: string;
  tokenTtlSeconds: number;
};

/** The claims inside the access token; the API reads them as `req.user`. */
export type UserToken = { email: string };

export type DecodedToken = { user: UserToken };

declare module "express-serve-static-core" {
  interface Request {
    user?: UserToken;
  }
}
