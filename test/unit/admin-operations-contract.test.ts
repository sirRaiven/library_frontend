import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { source } from "../helpers/source-files";

const composable = source(join(process.cwd(), "app/composables/useAdminOperations.ts"));
const page = source(join(process.cwd(), "app/pages/admin/operations.vue"));
const layout = source(join(process.cwd(), "app/layouts/admin.vue"));

describe("Administrator Library Operations monitoring contract", () => {
  it("uses one protected read-only summary endpoint", () => {
    expect(composable).toContain('"/api/admin-operations/summary"');
    expect(composable).not.toContain("POST");
    expect(composable).not.toContain("PATCH");
    expect(composable).not.toContain("DELETE");
  });

  it("covers the core Library operational areas", () => {
    for (const label of [
      "Collection Status",
      "Circulation and Reservations",
      "Membership",
      "Fines and Payments",
      "Faculty Accountability",
      "Attendance Today",
      "Recent Library Activity",
    ]) {
      expect(page).toContain(label);
    }
  });

  it("keeps the Administrator view explicitly read-only", () => {
    expect(page).toContain("read-only administrative view");
    expect(page).not.toContain("@click=\"borrow");
    expect(page).not.toContain("@click=\"return");
  });

  it("adds Library Operations to Administrator navigation", () => {
    expect(layout).toContain('label: "Library Operations"');
    expect(layout).toContain('to: "/admin/operations"');
  });
});
