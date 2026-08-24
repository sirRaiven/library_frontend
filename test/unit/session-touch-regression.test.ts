import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  const result: string[] = [];

  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      result.push(...sourceFiles(fullPath));
      continue;
    }

    if (/\.(?:ts|vue|js|mjs)$/.test(entry)) result.push(fullPath);
  }

  return result;
}

describe("session monitoring regression guard", () => {
  it("does not restore recurring session-touch endpoints", () => {
    const appRoot = join(process.cwd(), "app");
    const offenders = sourceFiles(appRoot)
      .filter((file) => readFileSync(file, "utf8").includes("/session/touch"))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
