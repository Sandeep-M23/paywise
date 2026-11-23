export function corsOriginsFromEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
