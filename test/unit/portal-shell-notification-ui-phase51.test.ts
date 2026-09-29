import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const read = (file: string) => source(resolve(process.cwd(), file));

describe("Phase 5.1 portal shell and notification UI", () => {
  it("removes redundant sidebar controls across portal shells", () => {
    const student = read("app/layouts/student.vue");
    const faculty = read("app/layouts/faculty.vue");
    const librarian = read("app/layouts/librarian.vue");
    const admin = read("app/layouts/admin.vue");

    expect(student).not.toContain("<UDashboardSidebarToggle");
    expect(faculty).not.toContain("<UDashboardSidebarToggle");

    for (const layout of [student, faculty]) {
      expect(layout).toContain('<UDashboardSidebarCollapse\n                class="hidden lg:inline-flex"');
    }

    for (const layout of [librarian, admin]) {
      expect(layout).toContain('<UDashboardSidebarToggle\n                class="lg:hidden"');
      expect(layout).toContain('<UDashboardSidebarCollapse\n                class="hidden lg:inline-flex"');
    }
  });

  it("uses one shared accessible notification trigger for portals that support notifications", () => {
    const student = read("app/layouts/student.vue");
    const librarian = read("app/layouts/librarian.vue");
    const trigger = read("app/components/shared/PortalNotificationTrigger.vue");

    expect(student).toContain("PortalNotificationTrigger");
    expect(librarian).toContain("PortalNotificationTrigger");
    expect(student).not.toContain("<UChip");
    expect(librarian).not.toContain("<UChip");

    expect(trigger).toContain("i-lucide-bell-ring");
    expect(trigger).toContain("bg-error");
    expect(trigger).toContain("99+");
    expect(trigger).toContain('aria-live="polite"');
    expect(trigger).toContain('role="status"');
    expect(trigger).toContain("unread notification");
  });

  it("presents unread state consistently inside Student and Librarian notification centers", () => {
    const student = read("app/pages/student/notifications.vue");
    const librarian = read("app/pages/librarian/notifications.vue");

    expect(student).toContain("<UBadge");
    expect(librarian).toContain("<UBadge");
    expect(librarian).not.toContain("<UChip");
    expect(student).toContain("unread notification");
    expect(librarian).toContain("unread notification");
  });
});
