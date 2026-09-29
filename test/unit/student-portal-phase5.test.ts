import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Phase 5 Student portal finalization", () => {
  it("connects dashboard attention items to targeted Student views", () => {
    const source = read("app/pages/student/dashboard.vue");
    expect(source).toContain("/student/borrowings?attention=overdue");
    expect(source).toContain("/student/borrowings?attention=due-soon");
    expect(source).toContain("/student/reservations?status=ready");
  });

  it("keeps borrowing and reservation filters deep-linkable and accessible", () => {
    const borrowings = read("app/pages/student/borrowings.vue");
    const reservations = read("app/pages/student/reservations.vue");
    expect(borrowings).toContain('queryText("attention"');
    expect(borrowings).toContain('aria-label="Current loan attention filter"');
    expect(borrowings).toContain('aria-label="Search borrowing records"');
    expect(reservations).toContain('route.query.status === "ready"');
    expect(reservations).toContain('label: "Ready for Pickup"');
    expect(reservations).toContain(':aria-pressed="status === item.value"');
  });

  it("preserves filters in Student history and notifications", () => {
    const history = read("app/pages/student/history.vue");
    const notifications = read("app/pages/student/notifications.vue");
    expect(history).toContain("syncRouteQuery");
    expect(history).toContain('aria-label="Search my Library history"');
    expect(notifications).toContain("syncRouteQuery");
    expect(notifications).toContain('aria-live="polite"');
  });

  it("clarifies membership and links circulation items back to book details", () => {
    expect(read("app/pages/student/library-card.vue")).toContain(
      'title="Library Card and membership are separate"',
    );
    for (const file of [
      "app/components/student/StudentBorrowingCard.vue",
      "app/components/student/StudentReservationCard.vue",
    ]) {
      expect(read(file), file).toContain("View book details for");
    }
  });
});
