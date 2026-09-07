import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("SNCBT UI design system", () => {
  it("uses an emerald brand with neutral-dominant surfaces and semantic colors", () => {
    const config = read("app.config.ts");
    expect(config).toContain('primary: "emerald"');
    expect(config).toContain('neutral: "slate"');
    expect(config).toContain('warning: "amber"');
    expect(config).toContain('error: "red"');
  });

  it("provides keyboard focus and reduced-motion behavior", () => {
    const css = read("app/assets/css/main.css");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(".sncbt-skip-link");
  });

  it("provides a skip link and main landmark in every authenticated portal", () => {
    for (const portal of ["admin", "librarian", "student", "faculty"]) {
      const layout = read(`app/layouts/${portal}.vue`);
      expect(layout).toContain("<AppSkipLink />");
      expect(layout).toContain('id="main-content"');
    }
  });

  it("preserves the approved responsive light/dark sign-in canvas", () => {
    const page = read("app/pages/index.vue");
    expect(page).toContain('relative min-h-screen overflow-hidden');
    expect(page).toContain('bg-[#eef6f2]');
    expect(page).toContain('dark:bg-[#020c12]');
    expect(page).toContain('colorMode.preference');
  });
});
