import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "api",
    include: ["test/**/*.test.ts"],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
