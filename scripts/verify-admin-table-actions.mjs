import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (value, message) => { if (!value) { console.error(`Admin table action verification FAILED: ${message}`); process.exit(1); } };

const data = read("app/pages/admin/data-management.vue");
const users = read("app/pages/admin/users/index.vue");
const librarians = read("app/pages/admin/librarians/index.vue");
const accounts = read("app/pages/admin/accounts-review.vue");
const activity = read("app/pages/admin/activity.vue");
const audit = read("app/pages/admin/audit-logs.vue");
const sessions = read("app/pages/admin/sessions.vue");
const devices = read("app/pages/admin/devices.vue");

for (const token of ["openCreate", "View Record", "openEdit", "Archive Record"]) assert(data.includes(token), `Data Management missing ${token}`);
for (const token of ["Add User", "View account", "openEdit", "Block account"]) assert(users.includes(token), `Users table missing ${token}`);
for (const token of ["Add Librarian", "View Librarian account", "Edit Librarian", "Deactivate"]) assert(librarians.includes(token), `Librarians table missing ${token}`);
assert(accounts.includes("Review Account") && accounts.includes("Create Portal Account"), "Accounts Review is missing underlying-record actions.");
assert(activity.includes("View activity"), "Activity Log must keep a read/view action.");
assert(audit.includes("View") || audit.includes("openDetail"), "Audit Log must keep a read/view action.");
assert(sessions.includes("View session") && sessions.includes("Revoke session"), "Sessions must expose view and revoke lifecycle actions.");
assert(devices.includes("View device") && devices.includes("Block Device") && devices.includes("Mark Trusted"), "Devices must expose view and security lifecycle actions.");

console.log("Administrator table action verification passed.");
