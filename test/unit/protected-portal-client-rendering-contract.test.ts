import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "nuxt.config.ts"), "utf8");

describe("authenticated portal rendering contract", () => {
  it("client-renders authenticated portal roots and descendants to avoid session-hint SSR hydration drift", () => {
    for (const route of [
      '"/admin"', '"/admin/**"',
      '"/librarian"', '"/librarian/**"',
      '"/student"', '"/student/**"',
      '"/faculty"', '"/faculty/**"',
    ]) {
      expect(source, route).toContain(route);
    }
    expect(source.match(/ssr:\s*false/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
  });
});
