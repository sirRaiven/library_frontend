import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const expect = (condition, message) => {
  if (!condition) {
    console.error(`DS-8.1 permanent dark navigation verification failed: ${message}`);
    process.exit(1);
  }
};

const css = read("app/assets/css/main.css");
const packageJson = JSON.parse(read("package.json"));

for (const token of [
  "Design System v2 — DS-8.1: permanent dark navigation shell",
  "color-scheme: dark",
  "--ui-bg: #041725",
  "--ui-bg-elevated: #082036",
  "--ui-text: #dbe7ee",
  "--ui-text-muted: #91a8b7",
  "--ui-primary: #34d399",
  "linear-gradient(180deg, #041725 0%, #031118 54%, #020b11 100%)",
  ".dark .sncbt-sidebar-surface",
  ".sncbt-sidebar-mobile-content",
  "background-color: rgba(16, 185, 129, 0.115) !important",
  ".sncbt-mobile-bottom-nav",
  "color-scheme: normal",
]) {
  expect(css.includes(token), `missing fixed-dark navigation token: ${token}`);
}

for (const layoutName of ["admin", "librarian", "student", "faculty"]) {
  const layout = read(`app/layouts/${layoutName}.vue`);
  expect(layout.includes("sncbt-sidebar-surface"), `${layoutName} sidebar must remain attached to the fixed-dark shared surface.`);
  expect(layout.includes("sncbt-sidebar-mobile-content"), `${layoutName} mobile drawer must remain attached to the fixed-dark shared surface.`);
}

expect(
  packageJson.scripts["verify:design-system:dark-navigation"] === "node scripts/verify-design-system-dark-navigation.mjs",
  "DS-8.1 verifier package command is missing.",
);
expect(
  packageJson.scripts["verify:design-system"].includes("verify:design-system:dark-navigation"),
  "Main design-system gate must include DS-8.1 dark navigation verification.",
);

const doc = read("docs/DS8_1_PERMANENT_DARK_NAVIGATION_SHELL.md");
for (const token of [
  "Administrator",
  "Librarian",
  "Student",
  "Faculty",
  "Light mode",
  "Dark mode",
  "mobile drawer",
  "bottom navigation",
  "business logic",
]) {
  expect(doc.includes(token), `DS-8.1 documentation missing: ${token}`);
}

console.log("SNCBT Design System v2 DS-8.1 permanent dark navigation shell verification passed.");
console.log("Coverage: Admin, Librarian, Student and Faculty desktop sidebars plus mobile drawers; Student/Faculty bottom navigation remains color-mode aware.");
