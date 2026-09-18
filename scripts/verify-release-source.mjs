import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const failures = [];
const mustExist = [
  "app/pages/admin/dashboard.vue",
  "app/pages/admin/operations.vue",
  "app/pages/admin/reports.vue",
  "app/pages/admin/audit-logs.vue",
  "app/pages/admin/system-health.vue",
  "app/pages/librarian/dashboard.vue",
  "app/pages/student/dashboard.vue",
  "app/pages/faculty/dashboard.vue",
  "test/unit/authentication-contract.test.ts",
  "test/unit/role-routing-contract.test.ts",
  "test/unit/system-maintenance-contract.test.ts",
];
const mustNotExist = [
  "app/pages/admin/privacy-retention.vue",
  "app/pages/admin/security-alerts.vue",
  "app/pages/admin/security-incidents.vue",
];
for (const rel of mustExist) if (!fs.existsSync(path.join(root, rel))) failures.push(`Missing required release source: ${rel}`);
for (const rel of mustNotExist) if (fs.existsSync(path.join(root, rel))) failures.push(`Removed/out-of-scope page is still present: ${rel}`);
const reports = fs.readFileSync(path.join(root, "app/pages/admin/reports.vue"), "utf8");
if (!reports.includes("Monitoring Reports")) failures.push("Unified Reports page no longer exposes Monitoring Reports.");
const monitoring = fs.readFileSync(path.join(root, "app/pages/admin/monitoring-reports.vue"), "utf8");
if (!(monitoring.includes('path: "/admin/reports"') && monitoring.includes('view: "monitoring"'))) failures.push("Legacy Monitoring Reports URL no longer redirects to unified Reports.");
const authGuard = fs.readFileSync(path.join(root, "app/middleware/auth.global.ts"), "utf8");
for (const prefix of ["/admin", "/librarian", "/student/", "/faculty"]) if (!authGuard.includes(prefix)) failures.push(`Global role guard missing ${prefix}.`);
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(full);
    else if (/\.(ts|vue)$/.test(entry.name) && fs.readFileSync(full, "utf8").includes("/session/touch")) failures.push(`Session touch regression: ${path.relative(root, full)}`);
  }
}
scan(path.join(root, "app"));
if (failures.length) {
  console.error("SNCBT release source verification FAILED:\n");
  failures.forEach((item) => console.error(`  - ${item}`));
  process.exit(1);
}
console.log("SNCBT release source verification PASSED.");
