import { defineConfig } from "vitest/config";

// One runner for the whole monorepo; each workspace declares its own project config.
export default defineConfig({
  test: {
    projects: ["packages/*", "apps/*"],
  },
});
