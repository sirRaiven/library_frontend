import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relative: string) => readFileSync(join(root, relative), "utf8");

describe("Design System DS-8.1 permanent dark navigation contract", () => {
  it("keeps authenticated sidebars in the same navy theme in both color modes", () => {
    const css = read("app/assets/css/main.css");
    expect(css).toContain("Design System v2 — DS-8.1: permanent dark navigation shell");
    expect(css).toContain("--ui-bg: #041725");
    expect(css).toContain("--ui-text: #dbe7ee");
    expect(css).toContain("--ui-primary: #34d399");
    expect(css).toContain(".dark .sncbt-sidebar-surface");
    expect(css).toContain("linear-gradient(180deg, #041725 0%, #031118 54%, #020b11 100%)");
  });

  it("covers desktop sidebars and mobile drawer surfaces for every portal", () => {
    for (const layout of ["admin", "librarian", "student", "faculty"]) {
      const source = read(`app/layouts/${layout}.vue`);
      expect(source).toContain("sncbt-sidebar-surface");
      expect(source).toContain("sncbt-sidebar-mobile-content");
    }
  });

  it("uses restrained emerald navigation emphasis", () => {
    const css = read("app/assets/css/main.css");
    expect(css).toContain("background-color: rgba(16, 185, 129, 0.115) !important");
    expect(css).toContain("color: #6ee7b7 !important");
    expect(css).toContain("box-shadow: inset 3px 0 0 rgba(52, 211, 153, 0.78)");
  });

  it("does not force the Student and Faculty bottom navigation into permanent dark mode", () => {
    const css = read("app/assets/css/main.css");
    expect(css).toContain(".sncbt-mobile-bottom-nav");
    expect(css).toContain("color-scheme: normal");
  });
});
