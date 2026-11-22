import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AuthConfig } from "../interfaces/middlewares/auth";
import { verifyToken } from "../utils/auth/auth-utils";
import { httpError } from "../utils/helpers/errors";

const unauthenticated = () => httpError(401, "unauthenticated", "Please sign in");

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

export const skipAuth: RequestHandler = (_req, _res, next) => next();
