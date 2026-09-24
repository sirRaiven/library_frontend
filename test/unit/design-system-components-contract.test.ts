import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("SNCBT Design System v2 DS-3 shared components", () => {
  it("provides mobile-first filter and responsive data patterns", () => {
    const filter = read("app/components/shared/AppFilterBar.vue");
    const dataView = read("app/components/shared/AppResponsiveDataView.vue");
    const record = read("app/components/shared/AppRecordCard.vue");

    expect(filter).toContain("Filters (${activeCount})");
    expect(filter).toContain("sncbt-filter-bar__advanced--open");
    expect(dataView).toContain('class="md:hidden"');
    expect(dataView).toContain('class="hidden md:block"');
    expect(record).toContain("sncbt-record-card__title-link");
  });

  it("provides consistent async, status, form, dialog and action patterns", () => {
    expect(read("app/components/shared/AppAsyncState.vue")).toContain('aria-busy="true"');
    expect(read("app/components/shared/AppStatusBadge.vue")).toContain("sncbt-status-badge__dot");
    expect(read("app/components/shared/AppStickyFormActions.vue")).toContain("sncbt-form-actions");
    expect(read("app/components/shared/AppDialogFrame.vue")).toContain("sncbt-dialog-frame__footer");
    expect(read("app/components/shared/AppActionBar.vue")).toContain("sncbt-action-bar--mobile-sticky");
  });

  it("keeps concise operational page descriptions optional", () => {
    expect(read("app/components/shared/AppPageHeader.vue")).toContain("description?: string");
  });
});
