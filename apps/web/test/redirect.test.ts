import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "../utils/helpers/others/redirect";

const origin = "https://paywise.example";

describe("safeRedirectPath", () => {
  it("keeps a path on this site, with its query and hash", () => {
    expect(safeRedirectPath("/employees?country=IN#top", origin)).toBe("/employees?country=IN#top");
  });

  it("falls back to the home page when there is no target", () => {
    expect(safeRedirectPath(null, origin)).toBe("/");
    expect(safeRedirectPath("", origin)).toBe("/");
  });

  it.each([
    "https://evil.example/login",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "/\t/evil.example",
    "javascript:alert(1)",
  ])("refuses %j, which leaves the site", (next) => {
    expect(safeRedirectPath(next, origin)).toBe("/");
  });
});
