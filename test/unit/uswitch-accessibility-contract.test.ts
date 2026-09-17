import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

function vueFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return vueFiles(path);
    return extname(entry.name) === ".vue" ? [path] : [];
  });
}

describe("USwitch accessibility contract", () => {
  it("gives every rendered switch an explicit accessible name", () => {
    const appRoot = resolve(process.cwd(), "app");
    const issues: string[] = [];

    for (const file of vueFiles(appRoot)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/<USwitch\b[\s\S]*?\/>/g)) {
        const markup = match[0];
        if (markup.includes("aria-label") || markup.includes("aria-labelledby")) continue;
        const line = source.slice(0, match.index ?? 0).split("\n").length;
        issues.push(`${relative(process.cwd(), file)}:${line}`);
      }
    }

    expect(issues, `USwitch controls missing aria-label/aria-labelledby: ${issues.join(", ")}`).toEqual([]);
  });
});
