import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

const css = read("app/assets/css/main.css");
const student = read("app/layouts/student.vue");
const faculty = read("app/layouts/faculty.vue");

describe("DS-8.3.1 desktop member portal visibility contract", () => {
  it("keeps Student and Faculty page content mounted inside the dashboard panel", () => {
    for (const source of [student, faculty]) {
      expect(source).toContain('class="sncbt-mobile-bottom-nav-spacer');
      expect(source).toContain('<div class="sncbt-portal-view">');
      expect(source).toContain("<slot />");
    }
  });

  it("never hides the main-content spacer class at desktop widths", () => {
    expect(css).not.toMatch(
      /@media\s*\(min-width:\s*1024px\)[\s\S]{0,500}\.sncbt-mobile-bottom-nav\s*,\s*\.sncbt-mobile-bottom-nav-spacer\s*\{\s*display:\s*none\s*!important\s*;/,
    );
    expect(css).toContain(".sncbt-mobile-bottom-nav-spacer {\n    display: block !important;\n    padding-bottom: 0;");
  });

  it("still hides the fixed phone/tablet navigation on desktop", () => {
    expect(css).toContain(".sncbt-mobile-bottom-nav {\n    display: none !important;");
  });

  it("preserves the mobile real-flow clearance for Safari and fixed bottom navigation", () => {
    expect(css).toContain(".sncbt-mobile-bottom-nav-spacer::after");
    expect(css).toContain("height: var(--sncbt-mobile-bottom-nav-clearance)");
  });
});
