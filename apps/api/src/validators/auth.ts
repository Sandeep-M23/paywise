import { loginSchema, type LoginInput } from "@paywise/shared";
import { validateBody } from "./validate";

export type LoginPayload = LoginInput;

export const validateLoginBody = validateBody(loginSchema);
