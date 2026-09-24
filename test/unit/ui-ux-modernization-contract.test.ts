import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const read = (file: string) => source(resolve(process.cwd(), file));

describe("UI/UX modernization contract", () => {
  it("keeps Librarian navigation visible and exposes collapsed group routes", () => {
    const layout = read("app/layouts/librarian.vue");
    expect(layout).toContain("librarian-content-navigation:${route.path}");
    expect(layout).toContain(':default-open="true"');
    expect(layout).toContain("getCompactChildItems");
    expect(layout).toContain('aria-haspopup="menu"');
    expect(layout).toContain('class="hidden lg:inline-flex"');
  });

  it("preserves important Librarian destinations", () => {
    const layout = read("app/layouts/librarian.vue");
    for (const route of [
      "/librarian/visits", "/librarian/borrow", "/librarian/return",
      "/librarian/reservations", "/librarian/books", "/librarian/students",
      "/librarian/faculty", "/librarian/memberships", "/librarian/reports",
      "/librarian/history", "/librarian/membership-term",
    ]) expect(layout).toContain(route);
  });

  it("keeps book collection write/export/scanner workflows available", () => {
    const page = read("app/pages/librarian/books/index.vue");
    expect(page).toContain("LiveBarcodeScanner");
    expect(page).toContain("exportInventory");
    expect(page).toContain('/librarian/books/import');
    expect(page).toContain('/librarian/books/copies');
    expect(page).toContain('/librarian/books/register');
  });
});
