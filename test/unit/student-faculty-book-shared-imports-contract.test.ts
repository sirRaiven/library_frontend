import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { source } from "../helpers/source-files";

describe("student and faculty shared book component imports", () => {
  const read = (relativePath: string) => source(resolve(process.cwd(), relativePath));

  it("explicitly imports shared book-card components where they are used", () => {
    expect(read("app/components/student/StudentBookCard.vue")).toContain(
      'import PortalBookCard from "~/components/shared/PortalBookCard.vue";',
    );
    expect(read("app/pages/faculty/books/index.vue")).toContain(
      'import PortalBookCard from "~/components/shared/PortalBookCard.vue";',
    );
  });

  it("explicitly imports the shared cover component where it is rendered", () => {
    for (const file of [
      "app/components/shared/PortalBookCard.vue",
      "app/pages/student/books/[documentId].vue",
      "app/pages/faculty/books/[documentId].vue",
    ]) {
      expect(read(file)).toContain(
        'import LibraryBookCover from "~/components/shared/LibraryBookCover.vue";',
      );
    }
  });
});
