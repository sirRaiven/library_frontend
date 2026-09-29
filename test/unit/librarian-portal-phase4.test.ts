import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Phase 4 Librarian portal reconciliation", () => {
  it("keeps dashboard actions connected to actionable filtered records", () => {
    const source = read("app/pages/librarian/dashboard.vue");
    expect(source).toContain('/librarian/history?category=borrowing&search=Borrowed');
    expect(source).toContain('/librarian/history?category=borrowing&search=Overdue');
    expect(source).toContain('/librarian/reservations?status=Pending');
    expect(source).not.toContain('/librarian/borrow?status=Overdue');
  });

  it("connects Student Record from operational Librarian workflows", () => {
    const directLinkFiles = [
      "app/pages/librarian/borrow.vue",
      "app/pages/librarian/return.vue",
      "app/pages/librarian/reservations.vue",
      "app/pages/librarian/visits.vue",
      "app/pages/librarian/fines.vue",
      "app/pages/librarian/memberships.vue",
    ];

    for (const file of directLinkFiles) {
      expect(read(file), file).toContain("Student Record");
    }

    // History intentionally delegates member-record rendering to the shared
    // HistoryLogItem component. Verify the integration contract instead of
    // requiring duplicated button text in the page itself.
    const history = read("app/pages/librarian/history.vue");
    const historyItem = read("app/components/HistoryLogItem.vue");

    expect(history).toContain("link-member-record");
    expect(historyItem).toContain("linkMemberRecord?: boolean");
    expect(historyItem).toContain("entry.member?.type === 'Student'");
    expect(historyItem).toContain(
      "/librarian/students/${encodeURIComponent(entry.member.documentId)}/record",
    );
    expect(historyItem).toContain("View Student Record for");
  });

  it("honors deep-link filters and keeps them accessible", () => {
    const history = read("app/pages/librarian/history.vue");
    const reservations = read("app/pages/librarian/reservations.vue");
    expect(history).toContain('queryChoice("category"');
    expect(history).toContain('queryText("search")');
    expect(history).toContain('aria-label="Search Library history"');
    expect(reservations).toContain("route.query.status");
    expect(reservations).toContain('aria-label="Reservation status"');
  });

  it("preserves the enhanced Student Record activity contract", () => {
    const source = read("app/pages/librarian/students/[identifier]/record.vue");
    expect(source).toContain('{ label: "Fines", value: historySummary.fine');
    expect(source).toContain("The start date must be earlier");
  });
});
