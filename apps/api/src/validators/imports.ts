import { importRequestSchema } from "@paywise/shared";
import { validateBody } from "./validate";

export const validateImportBody = validateBody(importRequestSchema);
