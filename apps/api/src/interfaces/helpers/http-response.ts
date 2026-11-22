import type { Request } from "express";

export type ResponsePayload<T> = {
  status?: number;
  message?: string;
  data: T;
};

export type ResponseObject<T> = {
  status: number;
  message: string;
  data: T;
};

/**
 * A request whose body and query were parsed by a validator middleware
 * (validators/validate.ts), so they already have these types at runtime.
 */
export type ValidatedRequest<
  Body = unknown,
  Query = unknown,
  Params = Record<string, string>,
> = Request<Params, unknown, Body, Query>;
