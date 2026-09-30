import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = file => readFileSync(resolve(root, file), "utf8");
const fail = message => {
  console.error(`[phase5.1] ${message}`);
  process.exitCode = 1;
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

const student = read("app/layouts/student.vue");
const faculty = read("app/layouts/faculty.vue");
const librarian = read("app/layouts/librarian.vue");
const admin = read("app/layouts/admin.vue");
const trigger = read("app/components/shared/PortalNotificationTrigger.vue");
const studentNotifications = read("app/pages/student/notifications.vue");
const librarianNotifications = read("app/pages/librarian/notifications.vue");

expect(!student.includes("<UDashboardSidebarToggle"), "Student shell should use mobile bottom navigation instead of a second header drawer toggle.");
expect(!faculty.includes("<UDashboardSidebarToggle"), "Faculty shell should use mobile bottom navigation instead of a second header drawer toggle.");

for (const [name, source] of [["Administrator", admin], ["Librarian", librarian]]) {
  expect(source.includes('<UDashboardSidebarToggle\n                class="lg:hidden"'), `${name} mobile drawer toggle must be hidden on desktop.`);
  expect(source.includes('<UDashboardSidebarCollapse\n                class="hidden lg:inline-flex"'), `${name} desktop collapse control must be hidden on mobile.`);
}

for (const [name, source] of [["Student", student], ["Faculty", faculty]]) {
  expect(source.includes('<UDashboardSidebarCollapse\n                class="hidden lg:inline-flex"'), `${name} desktop shell must retain one collapse control.`);
}

expect(student.includes("PortalNotificationTrigger"), "Student shell must use the shared notification trigger.");
expect(librarian.includes("PortalNotificationTrigger"), "Librarian shell must use the shared notification trigger.");
expect(!student.includes("<UChip"), "Student shell must not use the old notification UChip overlay.");
expect(!librarian.includes("<UChip"), "Librarian shell must not use the old notification UChip overlay.");
expect(!student.includes("chip:\n"), "Student navigation must not overlay a chip on the notification icon.");
expect(student.includes("unread)"), "Student sidebar notification label should explain that the count is unread.");

for (const token of [
  "i-lucide-bell-ring",
  "99+",
  "bg-error",
  'aria-live="polite"',
  'role="status"',
  "unread notification",
]) {
  expect(trigger.includes(token), `Shared notification trigger is missing: ${token}`);
}

expect(!librarianNotifications.includes("<UChip"), "Librarian Notification Center must replace the old unread UChip.");
expect(librarianNotifications.includes("<UBadge"), "Librarian Notification Center must show an explicit unread badge.");
expect(studentNotifications.includes("<UBadge"), "Student Notification Center must show the same explicit unread badge.");
expect(studentNotifications.includes("unread notification"), "Student unread status needs an accessible description.");
expect(librarianNotifications.includes("unread notification"), "Librarian unread status needs an accessible description.");

if (!process.exitCode) {
  console.log("Phase 5.1 portal shell and notification UI verification passed.");
}
