import { expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

function filesUnder(root: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) result.push(...filesUnder(full));
    else if (entry.endsWith(".ts") || entry.endsWith(".vue")) result.push(full);
  }
  return result;
}

test("frontend runtime does not define institution-maintained master-data choices", () => {
  const allowedPreviewOnly = new Set([
    "app/pages/librarian/library-card-designer.vue",
  ]);
  const violations: string[] = [];

  for (const file of filesUnder(join(ROOT, "app"))) {
    const path = relative(ROOT, file).replaceAll("\\", "/");
    if (path === "app/composables/useReferenceData.ts") continue;
    if (allowedPreviewOnly.has(path)) continue;
    const content = readFileSync(file, "utf8");

    const banned = [
      /STUDENT_EDUCATIONAL_LEVELS/,
      /STUDENT_PROGRAM_OPTIONS/,
      /\[\s*["']Head Librarian["'][\s\S]{0,180}["']Assistant Librarian["'][\s\S]{0,180}["']Staff["']\s*\]/,
      /\[\s*["']Full-Time["'][\s\S]{0,240}["']Part-Time["'][\s\S]{0,240}["']Guest Lecturer["']/,
      /\[\s*["']College Department["'][\s\S]{0,360}["']Senior High School Department["']/,
      /\[\s*["']Filipiniana["'][\s\S]{0,360}["']Computer Program["']/,
      /\[\s*["']First Semester["'][\s\S]{0,160}["']Second Semester["'][\s\S]{0,160}["']Summer["']\s*\]/,
      /function\s+defaultSemester\s*\(/,
      /function\s+currentSemester\s*\(/,
    ];

    if (banned.some(pattern => pattern.test(content))) violations.push(path);
  }

  expect(violations).toEqual([]);
});
