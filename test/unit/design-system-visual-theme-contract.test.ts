import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relative: string) => readFileSync(join(root, relative), "utf8");

function walkVue(relative: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
    const next = `${relative}/${entry.name}`;
    if (entry.isDirectory()) files.push(...walkVue(next));
    else if (entry.isFile() && entry.name.endsWith(".vue")) files.push(next);
  }
  return files.sort();
}

describe("Design System DS-8 visual theme contract", () => {
  it("keeps the complete route inventory under the shared visual theme", () => {
    expect(walkVue("app/pages")).toHaveLength(69);
    for (const layout of ["admin", "librarian", "student", "faculty"]) {
      const source = read(`app/layouts/${layout}.vue`);
      expect(source).toContain("sncbt-dashboard-canvas");
      expect(source).toContain("sncbt-navbar-surface");
      expect(source).toContain("sncbt-sidebar-surface");
    }
  });

  it("uses the approved Sign In mint and navy palette as shared tokens", () => {
    const css = read("app/assets/css/main.css");
    expect(css).toContain("--sncbt-theme-canvas-start: #f4faf7");
    expect(css).toContain("--sncbt-theme-canvas-end: #eaf3ef");
    expect(css).toContain("--sncbt-theme-canvas-start: #031118");
    expect(css).toContain("--sncbt-theme-canvas-end: #020b11");
    expect(css).toContain("--sncbt-theme-orb");
  });

  it("harmonizes cards and overlays without making data regions decorative", () => {
    const config = read("app.config.ts");
    const css = read("app/assets/css/main.css");
    expect(config).toContain("sncbt-themed-card rounded-xl");
    expect(config).toContain("sncbt-theme-overlay rounded-lg");
    expect(config).toContain("sncbt-theme-overlay rounded-xl");
    expect(css).toContain("Bridge legacy hand-built surfaces into the theme");
    expect(css).toContain(".sncbt-metric-card::before");
    expect(css).toContain(".sncbt-page-hero::after");
    expect(css).toContain("/* Data matrices remain intentionally quiet for scanability. */");
  });

  it("keeps the authenticated theme lightweight and print-safe", () => {
    const css = read("app/assets/css/main.css");
    const ds8 = css.slice(css.indexOf("Design System v2 — Wave DS-8"));
    expect(ds8).not.toContain("filter: blur(");
    expect(ds8).not.toContain("backdrop-filter:");
    expect(ds8).toContain("@media print");
    expect(ds8).toContain("background: #ffffff !important");
  });
});
