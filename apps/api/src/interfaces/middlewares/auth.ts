export type AuthConfig = {
  email: string;
  passwordHash: string;
  jwtSecret: string;
  tokenTtlSeconds: number;
};

export type UserToken = { email: string };

export type DecodedToken = { user: UserToken };

declare module "express-serve-static-core" {
  interface Request {
    user?: UserToken;
  }
}
