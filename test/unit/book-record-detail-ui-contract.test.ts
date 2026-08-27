import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { source } from "../helpers/source-files";

const projectFile = (path: string) => source(resolve(process.cwd(), path));

describe("book record detail UI contract", () => {
  it("uses the polished book identity and compact action menu", () => {
    const page = projectFile("app/pages/librarian/books/[id]/index.vue");

    expect(page).toContain("bookCoverThemes");
    expect(page).toContain("bookCoverTheme");
    expect(page).toContain("i-lucide-ellipsis-vertical");
    expect(page).toContain("More book actions");
    expect(page).toContain("Register Another");
    expect(page).not.toContain('label="Edit Book"');
    expect(page).not.toContain('label="Print All Labels"');
  });

  it("keeps copy information scannable and uses informational borrowed styling", () => {
    const page = projectFile("app/pages/librarian/books/[id]/index.vue");

    expect(page).toContain('Borrowed: "info"');
    expect(page).toContain("Physical Copies & Barcodes");
    expect(page).toContain("Inventory year");
    expect(page).toContain("Condition");
    expect(page).toContain("Shelf");
  });

  it("keeps barcode download as a secondary action", () => {
    const card = projectFile("app/components/librarian/BarcodeCard.vue");

    expect(card).toContain('label="Download PNG"');
    expect(card).toContain('color="neutral"');
    expect(card).toContain('variant="soft"');
  });
});
