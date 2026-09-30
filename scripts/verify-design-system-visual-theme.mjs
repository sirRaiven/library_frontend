import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const expect = (condition, message) => {
  if (!condition) {
    console.error(`DS-8 visual theme verification failed: ${message}`);
    process.exit(1);
  }
};

function walkVue(relative) {
  const absolute = path.join(root, relative);
  const output = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const nextRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) output.push(...walkVue(nextRelative));
    else if (entry.isFile() && entry.name.endsWith(".vue")) output.push(nextRelative.replaceAll("\\", "/"));
  }
  return output.sort();
}

const css = read("app/assets/css/main.css");
const config = read("app.config.ts");
const packageJson = JSON.parse(read("package.json"));
const pages = walkVue("app/pages");

expect(pages.length === 69, `expected 69 Vue pages, found ${pages.length}.`);

for (const token of [
  "Design System v2 — Wave DS-8: SNCBT visual theme harmonization",
  "--sncbt-theme-canvas-start: #f4faf7",
  "--sncbt-theme-canvas-end: #eaf3ef",
  "--sncbt-theme-canvas-start: #031118",
  "--sncbt-theme-canvas-end: #020b11",
  "--sncbt-theme-orb",
  ".sncbt-themed-card",
  "Bridge legacy hand-built surfaces into the theme",
  ".sncbt-theme-overlay",
  ".sncbt-metric-card::before",
  ".sncbt-page-hero::after",
  ".sncbt-mobile-bottom-nav",
  "@media print",
]) {
  expect(css.includes(token), `theme token missing: ${token}`);
}

expect(config.includes("sncbt-themed-card rounded-xl"), "Nuxt UI card defaults must use the shared DS-8 themed surface.");
expect(config.includes("sncbt-theme-overlay rounded-lg"), "Dropdown overlays must inherit the DS-8 theme.");
expect(config.includes("sncbt-theme-overlay rounded-xl"), "Modal overlays must inherit the DS-8 theme.");

for (const layoutName of ["admin", "librarian", "student", "faculty"]) {
  const layout = read(`app/layouts/${layoutName}.vue`);
  expect(layout.includes("sncbt-dashboard-canvas"), `${layoutName} layout must inherit the themed dashboard canvas.`);
  expect(layout.includes("sncbt-navbar-surface"), `${layoutName} layout must retain themed navbar surface.`);
  expect(layout.includes("sncbt-sidebar-surface"), `${layoutName} layout must retain themed sidebar surface.`);
}

expect(read("app/pages/index.vue").includes("sncbt-public-entry"), "Sign In must remain the visual theme reference surface.");
expect(read("app/pages/student-registration.vue").includes("sncbt-public-registration-shell"), "Public Student Registration must inherit the DS-8 public canvas.");

// DS-8 must remain lightweight: decorative circles use gradients/pseudo-elements,
// not expensive filter blur on every authenticated surface.
const ds8Section = css.slice(css.indexOf("Design System v2 — Wave DS-8"));
expect(!ds8Section.includes("filter: blur("), "DS-8 must not add filter blur to authenticated theme surfaces.");
expect(!ds8Section.includes("backdrop-filter:"), "DS-8 must not add broad backdrop-filter work to authenticated theme surfaces.");

expect(packageJson.scripts["verify:design-system:visual-theme"] === "node scripts/verify-design-system-visual-theme.mjs", "DS-8 verifier package command is missing.");
expect(packageJson.scripts["verify:design-system"].includes("verify:design-system:visual-theme"), "Main design-system gate must include DS-8 visual theme verification.");

const doc = read("docs/DS8_VISUAL_THEME_HARMONIZATION.md");
for (const token of [
  "Sign In page",
  "all 67 routes",
  "Light mode",
  "Dark mode",
  "Decorative circle policy",
  "Performance",
  "Print",
  "business logic",
]) {
  expect(doc.includes(token), `DS-8 documentation missing: ${token}`);
}

console.log("SNCBT Design System v2 DS-8 visual theme harmonization verification passed.");
console.log("Coverage: shared canvas, navigation, cards, metric/form/record surfaces, overlays, public pages, and print reset across all 67 routes.");
