import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
};

const layout = read("app/layouts/admin.vue");
const dashboard = read("app/pages/admin/dashboard.vue");
const users = read("app/pages/admin/users/index.vue");
const librarians = read("app/pages/admin/librarians/index.vue");
const sessions = read("app/pages/admin/sessions.vue");
const devices = read("app/pages/admin/devices.vue");
const archive = read("app/pages/admin/archive.vue");
const activity = read("app/pages/admin/activity.vue");
const audit = read("app/pages/admin/audit-logs.vue");
const accountReview = read("app/pages/admin/accounts-review.vue");

for (const component of [
  "app/components/admin/AdminSectionHeader.vue",
  "app/components/admin/AdminEmptyState.vue",
  "app/components/admin/AdminQuickAction.vue",
]) {
  assert(existsSync(resolve(root, component)), `${component} exists`);
}

for (const group of [
  "People & Access",
  "Library Administration",
  "Governance & Oversight",
  "System & Security",
]) {
  assert(layout.includes(`label: "${group}"`), `Administrator navigation includes ${group}`);
}

for (const route of [
  "/admin/users",
  "/admin/librarians",
  "/admin/accounts-review",
  "/admin/roles",
  "/admin/operations",
  "/admin/data-management",
  "/admin/settings",
  "/admin/reports",
  "/admin/audit-logs",
  "/admin/archive",
  "/admin/activity",
  "/admin/sessions",
  "/admin/devices",
  "/admin/system-health",
]) {
  assert(layout.includes(`to: "${route}"`), `Administrator navigation preserves ${route}`);
}

for (const token of [
  "Priority Summary",
  "Quick Actions",
  "Needs Attention",
  "Recent Administrative Activity",
  "Manage Users",
  "Review Accounts",
  "Manage Data",
  "Open Archive",
]) {
  assert(dashboard.includes(token), `Dashboard includes ${token}`);
}

const dashboardMetricCards = [...dashboard.matchAll(/<AdminMetricCard\b/g)].length;
assert(dashboardMetricCards === 1, "Dashboard uses one reusable metric-card template loop rather than duplicated metric markup");
assert(dashboard.includes('const metricCards = computed(() => ['), "Dashboard centralizes priority metric configuration");
assert(!dashboard.includes('label: "Registered Students"'), "Dashboard removes low-value registered-student metric");
assert(!dashboard.includes('label: "Registered Faculty"'), "Dashboard removes low-value registered-faculty metric");
assert(!dashboard.includes('label: "Book Copies"'), "Dashboard removes low-value collection-count metric");

assert(users.includes('aria-label="Search user accounts"'), "Users search has an accessible name");
assert(users.includes('aria-label="Filter users by role"'), "Users role filter has an accessible name");
assert(!users.includes('aria-label="Open account details"'), "Users table removes duplicate account-details action");
assert(users.includes("<AdminEmptyState"), "Users uses the standardized empty state");

assert(librarians.includes('aria-label="Search Librarian profiles"'), "Librarian management search has an accessible name");
assert(librarians.includes("<AdminEmptyState"), "Librarian management uses the standardized empty state");

for (const [name, source] of [["Sessions", sessions], ["Devices", devices]]) {
  assert(source.includes("<AppDialogFrame"), `${name} security action uses the shared dialog frame`);
  assert(source.includes(":dismissible=\"!"), `${name} destructive/security modal cannot dismiss while saving`);
  assert(source.includes("#actions"), `${name} dialog uses the standard actions slot`);
  assert(source.includes("Administrative reason"), `${name} action requires an administrative reason`);
}

assert(activity.includes('eyebrow="System & Security"'), "Activity page follows the System & Security information architecture");
assert(activity.includes('aria-label="Search activity records"'), "Activity search has an accessible name");
assert(audit.includes('aria-label="Search Audit Trail records"'), "Audit search has an accessible name");
assert(accountReview.includes('aria-label="Search account and profile review records"'), "Account Review search has an accessible name");

assert(archive.includes("sncbt-page-shell sncbt-staff-page"), "Archive uses the standard Administrator page shell");
assert(archive.includes(':aria-busy="loading || actionLoading"'), "Archive exposes busy state to assistive technology");
assert(archive.includes("<AdminEmptyState"), "Archive uses the standardized empty state");

const emptyState = read("app/components/admin/AdminEmptyState.vue");
assert(emptyState.includes('role="status"'), "Admin empty state exposes status semantics");
const quickAction = read("app/components/admin/AdminQuickAction.vue");
assert(quickAction.includes("focus-visible:ring-2"), "Admin quick action has a visible keyboard focus state");

if (process.exitCode) process.exit(process.exitCode);
console.log("Administrator Phase 3.3 UI/UX verification passed.");
