import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("book select runtime contract", () => {
  it("never uses an empty string as the All Shelf Locations option value", () => {
    const page = read("app/pages/librarian/books/index.vue");
    expect(page).toContain('const ALL_SHELF_LOCATIONS = "__all__"');
    expect(page).toContain(
      '{ label: "All Shelf Locations", value: ALL_SHELF_LOCATIONS }',
    );
    expect(page).not.toContain('{ label: "All Shelf Locations", value: "" }');
  });

  it("filters blank or reserved registry values before UI selects consume them", () => {
    const composable = read("app/composables/useLibraryOptions.ts");
    expect(composable).toContain("function optionFromRaw");
    expect(composable).toContain("RESERVED_VALUES");
    expect(composable).toContain("sanitizeLibraryOptions");
    expect(composable).toContain("activePayload.value.bookCategories");
    expect(composable).toContain("activePayload.value.shelfLocations");
  });
});
