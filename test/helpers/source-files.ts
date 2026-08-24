import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export function sourceFiles(directory: string): string[] {
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

export function source(path: string): string {
  return readFileSync(path, "utf8");
}
