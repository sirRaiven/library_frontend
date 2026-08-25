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

  it("preserves the required sign-in root wrapper", () => {
    const page = read("app/pages/index.vue");
    expect(page).toContain('min-h-screen flex flex-col justify-center items-center bg-[#f4fbf8] dark:bg-neutral-950 p-4 transition-colors relative overflow-hidden');
  });
});
