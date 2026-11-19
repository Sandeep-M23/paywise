import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "web",
    include: ["utils/**/*.test.ts", "hooks/**/*.test.ts", "components/**/*.test.tsx"],
  },
});
