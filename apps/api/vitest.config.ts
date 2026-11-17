import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "api",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    // Each test file boots its own in-process Postgres (PGlite).
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
