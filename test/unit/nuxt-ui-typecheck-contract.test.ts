import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const appRoot = join(root, "app");

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? vueFiles(path)
      : path.endsWith(".vue")
        ? [path]
        : [];
  });
}

describe("Nuxt UI typecheck compatibility", () => {
  it("keeps UButton assignment handlers explicitly void-returning", () => {
    const violations: string[] = [];

    for (const path of vueFiles(appRoot)) {
      const source = readFileSync(path, "utf8");
      const buttonPattern = /<UButton\b(?:(?!\/>|<\/UButton>).)*?@click\s*=\s*"([^"]+)"(?:(?!\/>|<\/UButton>).)*?(?:\/>|<\/UButton>)/gs;

      for (const match of source.matchAll(buttonPattern)) {
        const expression = match[1].replace(/\s+/g, " ").trim();
        if (expression.includes("=>")) continue;

        if (/(?<![=!<>])=(?!=)/.test(expression)) {
          violations.push(`${relative(root, path)}: ${expression}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
