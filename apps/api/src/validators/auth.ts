import { z } from "zod";
import { validateBody } from "./validate";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1).max(200),
});

export type LoginPayload = z.infer<typeof loginSchema>;

export const validateLoginBody = validateBody(loginSchema);
