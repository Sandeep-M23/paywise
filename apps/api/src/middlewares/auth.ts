import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AuthConfig } from "../interfaces/middlewares/auth";
import { verifyToken } from "../utils/auth/auth-utils";
import { httpError } from "../utils/helpers/errors";

/*
 * One HR user, configured by environment (REQUIREMENTS: a single sign-in;
 * multi-user roles are out of scope). The session is a signed JWT the web app
 * sends as `Authorization: Bearer`, so no session table is needed.
 */

const unauthenticated = () => httpError(401, "unauthenticated", "Please sign in");

/** Rejects requests without a valid access token; routes read the user as `req.user`. */
export const verifyAccessToken =
  (config: AuthConfig): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const [scheme, token] = req.headers.authorization?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) return next(unauthenticated());
    try {
      const decoded = verifyToken(token, config);
      if (!decoded.user?.email) return next(unauthenticated());
      req.user = decoded.user;
      return next();
    } catch {
      return next(unauthenticated());
    }
  };

/** Tests that exercise other features run without auth. */
export const skipAuth: RequestHandler = (_req, _res, next) => next();
