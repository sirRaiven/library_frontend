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

describe("Design System DS-7 whole-system UX contract", () => {
  it("preserves the complete 67-route page inventory", () => {
    const pages = walkVue("app/pages");
    expect(pages).toHaveLength(67);
    expect(pages.filter(file => file.startsWith("app/pages/admin/"))).toHaveLength(22);
    expect(pages.filter(file => file.startsWith("app/pages/librarian/"))).toHaveLength(25);
    expect(pages.filter(file => file.startsWith("app/pages/student/"))).toHaveLength(10);
    expect(pages.filter(file => file.startsWith("app/pages/faculty/"))).toHaveLength(7);
  });

  it("keeps dynamic-viewport protection around camera and large dialog surfaces", () => {
    const css = read("app/assets/css/main.css");
    const scanner = read("app/components/librarian/visits/LiveBarcodeScanner.vue");
    const approvals = read("app/pages/librarian/student-registration-approvals.vue");

    expect(css).toContain(".sncbt-camera-popover");
    expect(css).toContain("calc(100dvw - 1.5rem)");
    expect(scanner).toContain("sncbt-camera-popover");
    expect(scanner).not.toContain("w-[calc(100vw-1.5rem)]");

    expect(css).toContain(".sncbt-viewport-modal");
    expect(approvals).toContain("sncbt-viewport-modal");
    expect(approvals).not.toContain("100vw-1rem");
  });

  it("retains public and member mobile safety contracts", () => {
    expect(read("app/pages/index.vue")).toContain("sncbt-public-entry");
    expect(read("app/pages/student-registration.vue")).toContain("sncbt-public-registration-shell");

    for (const layout of ["student", "faculty"]) {
      const source = read(`app/layouts/${layout}.vue`);
      expect(source).toContain("sncbt-mobile-nav-scrollport");
      expect(source).toContain("sncbt-mobile-bottom-nav-spacer");
    }
  });

  it("rejects page-level whole-viewport width utilities", () => {
    const sources = [...walkVue("app/pages"), ...walkVue("app/layouts"), ...walkVue("app/components")];
    for (const file of sources) {
      const source = read(file);
      expect(source, file).not.toMatch(/\b(?:w-screen|min-w-screen)\b/);
      expect(source, file).not.toContain("100vw-");
    }
  });
});
