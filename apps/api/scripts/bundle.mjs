import { build } from "esbuild";

await build({
  entryPoints: ["src/vercel.ts"],
  outfile: "api/index.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  external: ["pg-native"],
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "info",
});
