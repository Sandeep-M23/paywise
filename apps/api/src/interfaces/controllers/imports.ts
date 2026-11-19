import type { Context } from "hono";

/** The signed-in email, set by the auth middleware. */
export type ImportContext = Context<{ Variables: { userEmail?: string } }>;
