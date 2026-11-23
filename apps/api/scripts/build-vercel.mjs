import { mkdir, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const output = ".vercel/output";
const fn = `${output}/functions/index.func`;

await rm(output, { recursive: true, force: true });
await mkdir(fn, { recursive: true });

await build({
  entryPoints: ["server.ts"],
  outfile: `${fn}/index.mjs`,
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  external: ["pg-native"],
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "info",
});

await writeFile(
  `${fn}/.vc-config.json`,
  JSON.stringify({ runtime: "nodejs24.x", handler: "index.mjs", launcherType: "Nodejs" }),
);
await writeFile(
  `${output}/config.json`,
  JSON.stringify({ version: 3, routes: [{ src: "/(.*)", dest: "/index" }] }),
);
