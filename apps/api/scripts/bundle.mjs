// Bundles the API, including the TypeScript workspace package @paywise/shared,
// into one ESM file that Vercel deploys as a single function. Bundling avoids
// depending on how the platform resolves TypeScript inside workspace packages.
import { build } from "esbuild";

await build({
  entryPoints: ["src/vercel.ts"],
  outfile: "api/index.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  // pg optionally requires a native binding we don't use.
  external: ["pg-native"],
  // Some bundled CommonJS dependencies call require(); give ESM one.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "info",
});
