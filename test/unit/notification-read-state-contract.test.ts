import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("librarian notification read-state contract", () => {
  it("keeps an opened notification visible until its details modal closes", () => {
    const page = read("app/pages/librarian/notifications.vue");

    expect(page).toContain("refreshUnreadList: false");
    expect(page).toContain("refreshUnreadAfterDetailsClose");
    expect(page).toContain('@update:open="handleDetailsOpenChange"');
  });

  it("describes the actual two-minute page refresh interval", () => {
    const page = read("app/pages/librarian/notifications.vue");

    expect(page).toContain("every 2 minutes while this page is open");
    expect(page).not.toContain("checked every 30 seconds");
  });
});
