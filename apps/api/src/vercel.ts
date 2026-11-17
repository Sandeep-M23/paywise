import { handle } from "hono/vercel";
import app from "./index";

// Vercel Function entry (bundled to api/index.js by scripts/bundle.mjs).
export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
