import { bodyLimit } from "hono/body-limit";
import { AppError } from "../utils/helpers/errors";

// Vercel Functions reject request bodies over 4.5 MB; fail early with a clear message.
export const MAX_IMPORT_BODY_BYTES = 4_400_000;

export const limitImportBody = bodyLimit({
  maxSize: MAX_IMPORT_BODY_BYTES,
  onError: () => {
    throw new AppError(413, "import_too_large", "File is too large; split it into smaller files");
  },
});
