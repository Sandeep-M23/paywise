import { fileURLToPath } from "node:url";
import { defineProject } from "vitest/config";

export default defineProject({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    name: "web",
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
