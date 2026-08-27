import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const read = (relativePath: string) => source(resolve(process.cwd(), relativePath));

describe("student and faculty book UI contract", () => {
  it("shares the decorative Library book cover treatment", () => {
    const cover = read("app/components/shared/LibraryBookCover.vue");
    expect(cover).toContain("SNCBT Library");
    expect(cover).toContain("bg-gradient-to-br");
    expect(cover).toContain("Collection");
    expect(cover).toContain("i-lucide-book-open");
  });

  it("uses one consistent portal book card in Student and Faculty collections", () => {
    const studentCard = read("app/components/student/StudentBookCard.vue");
    const facultyCollection = read("app/pages/faculty/books/index.vue");
    const sharedCard = read("app/components/shared/PortalBookCard.vue");

    expect(studentCard).toContain("<PortalBookCard");
    expect(facultyCollection).toContain("<PortalBookCard");
    expect(sharedCard).toContain("Availability");
    expect(sharedCard).toContain("View details");
    expect(sharedCard).toContain("sm:w-40");
  });

  it("uses the expanded decorative cover on both book detail pages", () => {
    const studentDetail = read("app/pages/student/books/[documentId].vue");
    const facultyDetail = read("app/pages/faculty/books/[documentId].vue");

    expect(studentDetail).toContain("<LibraryBookCover");
    expect(studentDetail).toContain('size="detail"');
    expect(studentDetail).toContain("Need help finding a copy?");
    expect(facultyDetail).toContain("<LibraryBookCover");
    expect(facultyDetail).toContain('size="detail"');
  });

  it("keeps ordinary borrowed-copy state informational rather than warning-colored", () => {
    const studentDetail = read("app/pages/student/books/[documentId].vue");
    expect(studentDetail).toContain('label="Currently Borrowed"');
    expect(studentDetail).toMatch(/label="Currently Borrowed"[\s\S]*?tone="info"/);
  });
});
