import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("SNCBT Design System v2 DS-4 staff page contract", () => {
  it("keeps the staff shell and responsive operational list patterns", () => {
    const adminLayout = read("app/layouts/admin.vue");
    const librarianLayout = read("app/layouts/librarian.vue");
    const users = read("app/pages/admin/users/index.vue");
    const students = read("app/pages/librarian/students.vue");
    const fines = read("app/pages/librarian/fines.vue");

    expect(adminLayout).toContain("sncbt-staff-view");
    expect(librarianLayout).toContain("sncbt-staff-view");
    expect(users).toContain("<AppResponsiveDataView");
    expect(users).toContain("<AppRecordCard");
    expect(students).toContain("<AppResponsiveDataView");
    expect(students).toContain("renew(student)");
    expect(fines.match(/<AppResponsiveDataView/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(fines).toContain("openPayment(fine)");
  });

  it("imports DS shared responsive components explicitly on migrated staff pages", () => {
    for (const file of [
      "app/pages/admin/users/index.vue",
      "app/pages/admin/librarians/index.vue",
      "app/pages/admin/accounts-review.vue",
      "app/pages/admin/activity.vue",
      "app/pages/admin/devices.vue",
      "app/pages/admin/sessions.vue",
      "app/pages/admin/audit-logs.vue",
      "app/pages/admin/users/[id]/activity.vue",
      "app/pages/admin/users/[id]/devices.vue",
      "app/pages/admin/users/[id]/sessions.vue",
      "app/pages/librarian/students.vue",
      "app/pages/librarian/faculty.vue",
      "app/pages/librarian/visits.vue",
      "app/pages/librarian/memberships.vue",
      "app/pages/librarian/fines.vue",
    ]) {
      const page = read(file);
      expect(page).toContain('import AppResponsiveDataView from "~/components/shared/AppResponsiveDataView.vue";');
      expect(page).toContain('import AppRecordCard from "~/components/shared/AppRecordCard.vue";');
    }
  });

  it("keeps the staff canvas vertically scrollable and responsive at constrained desktop widths", () => {
    const css = read("app/assets/css/main.css");
    const accountReview = read("app/pages/admin/accounts-review.vue");

    expect(css).toContain("overflow-y: auto");
    expect(css).toContain("overscroll-behavior-y: contain");
    expect(accountReview).toContain("sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5");
  });

  it("keeps barcode and circulation actions available", () => {
    expect(read("app/pages/librarian/borrow.vue")).toContain("handleCameraBarcodeDetected");
    expect(read("app/pages/librarian/return.vue")).toContain("handleCameraBarcodeDetected");
    expect(read("app/pages/librarian/visits.vue")).toContain("handleCameraBarcode");
    expect(read("app/pages/librarian/visits.vue")).not.toContain('icon="i-lucide-scan-line"s');
    expect(read("app/pages/librarian/books/index.vue")).toContain("handlePhysicalBookBarcodeDetected");
  });
});
