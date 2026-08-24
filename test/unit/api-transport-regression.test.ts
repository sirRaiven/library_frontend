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

describe("API transport regression guard", () => {
  const appRoot = join(process.cwd(), "app");
  const files = sourceFiles(appRoot);

  it("does not hardcode localhost Strapi URLs inside application code", () => {
    const offenders = files
      .filter((file) => /https?:\/\/localhost:1337/i.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("does not contain duplicated /api/api request paths", () => {
    const offenders = files
      .filter((file) => readFileSync(file, "utf8").includes("/api/api/"))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps credentialed authentication requests and the device header", () => {
    const authSource = readFileSync(
      join(process.cwd(), "app/composables/useAuth.ts"),
      "utf8",
    );

    expect(authSource).toContain('credentials: "include"');
    expect(authSource).toContain('headers.set("X-Device-ID"');
  });

  it("keeps Student monitoring requests capable of sending X-Student-Session", () => {
    const studentSources = files
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(studentSources).toContain("X-Student-Session");
  });
});
