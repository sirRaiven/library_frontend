import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { source } from "../helpers/source-files";

describe("librarian reports navigation contract", () => {
  it("does not auto-scroll away from the report controls when the page first opens", () => {
    const page = source(resolve(process.cwd(), "app/pages/librarian/reports.vue"));

    expect(page).toContain('generateReport("executive-summary", { scrollToPreview: false })');
    expect(page).toContain('options: { scrollToPreview?: boolean } = {}');
    expect(page).toContain('if (options.scrollToPreview !== false)');
  });
});
