import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const read = (relativePath: string) => source(resolve(process.cwd(), relativePath));

describe("Librarian book collection card UI", () => {
  it("uses a compact vertical-ellipsis action menu instead of exposed card action buttons", () => {
    const page = read("app/pages/librarian/books/index.vue");

    expect(page).toContain('icon="i-lucide-ellipsis-vertical"');
    expect(page).toContain(':items="bookActionItems(book)"');
    expect(page).toContain('aria-label="`Actions for ${book.title}`"');
    expect(page).not.toContain('label="Open Record"');
    expect(page).not.toContain('label="Edit Book"');
    expect(page).not.toContain('label="Print All Labels"');
  });

  it("keeps the important record actions available inside the menu", () => {
    const page = read("app/pages/librarian/books/index.vue");

    for (const action of ["Open record", "Edit book", "Print all labels"]) {
      expect(page).toContain(`label: "${action}"`);
    }
  });


  it("uses an expanded full-height decorative cover with meaningful lower content", () => {
    const page = read("app/pages/librarian/books/index.vue");

    expect(page).toContain("sm:min-h-[248px]");
    expect(page).toContain("w-32 shrink-0");
    expect(page).toContain("sm:flex sm:self-stretch");
    expect(page).toContain("bookCoverSecondaryLabel(book)");
    expect(page).toContain('name="i-lucide-library"');
    expect(page).toContain("Collection");
  });

  it("uses a deterministic decorative book-cover treatment and accessible open controls", () => {
    const page = read("app/pages/librarian/books/index.vue");

    expect(page).toContain("const bookCoverThemes = [");
    expect(page).toContain(':class="bookCoverTheme(book)"');
    expect(page).toContain("SNCBT Library");
    expect(page).toContain("bookCoverLabel(book)");
    expect(page).toContain(':aria-label="`Open ${book.title}`"');
    expect(page).toContain("View record");
  });
});
