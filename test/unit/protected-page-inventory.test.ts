import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pagesRoot = join(process.cwd(), "app/pages");

const roleFolders = ["admin", "librarian", "student", "faculty"] as const;
const requiredPages: Record<(typeof roleFolders)[number], string[]> = {
  admin: ["dashboard.vue", "activity.vue", "sessions.vue", "devices.vue"],
  librarian: ["dashboard.vue", "borrow.vue", "return.vue", "reservations.vue", "history.vue"],
  student: ["dashboard.vue", "borrowings.vue", "reservations.vue", "library-card.vue", "security.vue", "history.vue"],
  faculty: ["dashboard.vue", "borrowings.vue", "reports.vue", "profile.vue"],
};

describe("protected page inventory", () => {
  it.each(roleFolders)("keeps the %s portal directory", (role) => {
    const folder = join(pagesRoot, role);
    expect(existsSync(folder)).toBe(true);
    expect(readdirSync(folder).length).toBeGreaterThan(0);
  });

  for (const role of roleFolders) {
    it.each(requiredPages[role])(`keeps ${role}/%s`, (page) => {
      expect(existsSync(join(pagesRoot, role, page))).toBe(true);
    });
  }
});
