import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const read = (file: string) => source(resolve(process.cwd(), file));

describe("SNCBT Design System v2 DS-1 foundation", () => {
  it("defines the shared token, motion, density and touch foundation", () => {
    const css = read("app/assets/css/main.css");
    for (const token of [
      "--sncbt-ds-version",
      "--sncbt-color-canvas",
      "--sncbt-space-4",
      "--sncbt-radius-lg",
      "--sncbt-elevation-1",
      "--sncbt-motion-base",
      "--sncbt-touch-target",
    ]) expect(css).toContain(token);
    expect(css).toContain("@media (pointer: coarse)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("keeps Nuxt UI on the SNCBT semantic palette and restrained shapes", () => {
    const config = read("app.config.ts");
    expect(config).toContain('primary: "emerald"');
    expect(config).toContain('neutral: "slate"');
    expect(config).toContain('rounded-xl border border-default/80 bg-default');
    expect(config).toContain('base: "rounded-md font-medium"');
  });

  it("documents mobile-first and whole-system route coverage", () => {
    const docs = read("docs/SNCBT_DESIGN_SYSTEM_V2.md");
    const constants = read("app/constants/design-system.ts");
    expect(docs).toContain("All routes are in scope");
    expect(docs).toContain("320 px");
    expect(docs).toContain("67 Vue page files");
    expect(constants).toContain("minimumSupportedViewportPx: 320");
    expect(constants).toContain("touchTargetPx: 44");
  });
});
