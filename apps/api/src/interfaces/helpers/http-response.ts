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

export type ValidatedRequest<
  Body = unknown,
  Query = unknown,
  Params = Record<string, string>,
> = Request<Params, unknown, Body, Query>;
