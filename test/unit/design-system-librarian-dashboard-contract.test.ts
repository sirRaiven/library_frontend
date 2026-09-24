import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(process.cwd(), "app/pages/librarian/dashboard.vue"), "utf8");

describe("DS-8.2 Librarian Dashboard contract", () => {
  it("keeps the operational dashboard data source and actions", () => {
    expect(page).toContain("auth.authFetch<LibrarianDashboardResponse>");
    expect(page).toContain('"/api/circulation/dashboard-summary"');
    expect(page).toContain('to: "/librarian/visits"');
    expect(page).toContain('to: "/librarian/borrow"');
    expect(page).toContain('to: "/librarian/return"');
    expect(page).toContain('to: "/librarian/books/register"');
  });

  it("uses the rearranged dashboard sections", () => {
    expect(page).toContain("Circulation Desk");
    expect(page).toContain("Priority Queue");
    expect(page).toContain("Recent Circulation");
    expect(page).toContain("dashboard.unreadNotifications");
  });

  it("does not render separate mobile cards and a desktop table for the same recent records", () => {
    expect(page).not.toContain("sncbt-mobile-record-list md:hidden");
    expect(page).not.toContain("sncbt-table-surface hidden overflow-x-auto md:block");
    expect(page).not.toContain('<table class="w-full min-w-[46rem]">');
  });
});
