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

function hasAccessibleName(markup: string): boolean {
  return /(?:^|\s)(?::?aria-label|:?aria-labelledby|:?label)\s*=/.test(markup);
}

describe("interactive accessibility source scan", () => {
  it("names every square UButton explicitly", () => {
    const appRoot = resolve(process.cwd(), "app");
    const issues: string[] = [];

    for (const file of vueFiles(appRoot)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/<UButton\b[\s\S]*?(?:\/>|>)/g)) {
        const markup = match[0];
        if (!/(?:^|\s)(?::?square)(?:\s|=|>)/.test(markup)) continue;
        if (hasAccessibleName(markup)) continue;
        const line = source.slice(0, match.index ?? 0).split("\n").length;
        issues.push(`${relative(process.cwd(), file)}:${line}`);
      }
    }

    expect(issues, `square UButton controls missing accessible names: ${issues.join(", ")}`).toEqual([]);
  });

  it("names every UCheckbox explicitly", () => {
    const appRoot = resolve(process.cwd(), "app");
    const issues: string[] = [];

    for (const file of vueFiles(appRoot)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/<UCheckbox\b[\s\S]*?\/>/g)) {
        const markup = match[0];
        if (hasAccessibleName(markup)) continue;
        const line = source.slice(0, match.index ?? 0).split("\n").length;
        issues.push(`${relative(process.cwd(), file)}:${line}`);
      }
    }

    expect(issues, `UCheckbox controls missing accessible names: ${issues.join(", ")}`).toEqual([]);
  });
});
