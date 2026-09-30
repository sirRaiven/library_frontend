import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");
const fail = (message) => {
  console.error(`[design-system] ${message}`);
  process.exitCode = 1;
};
const expect = (condition, message) => { if (!condition) fail(message); };

function walk(dir) {
  const result = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}

const css = read("app/assets/css/main.css");
const appConfig = read("app.config.ts");
const constants = read("app/constants/design-system.ts");
const docs = read("docs/SNCBT_DESIGN_SYSTEM_V2.md");
const nuxt = read("nuxt.config.ts");

for (const token of [
  "--sncbt-ds-version",
  "--sncbt-color-canvas",
  "--sncbt-color-surface",
  "--sncbt-color-border",
  "--sncbt-space-4",
  "--sncbt-radius-lg",
  "--sncbt-elevation-1",
  "--sncbt-motion-base",
  "--sncbt-touch-target",
  "--sncbt-content-max",
]) {
  expect(css.includes(token), `Required DS-1 token missing: ${token}`);
}

expect(css.includes("SNCBT Library Design System v2"), "DS-1 CSS marker is missing.");
expect(css.includes("@media (pointer: coarse)"), "Coarse-pointer/touch contract is missing.");
expect(css.includes("prefers-reduced-motion: reduce"), "Reduced-motion contract is missing.");
expect(css.includes("min-height: var(--sncbt-touch-target)"), "44px touch-target rule is missing.");
expect(/sncbt-dashboard-canvas[\s\S]{0,420}radial-gradient/.test(css), "Authenticated product canvas must inherit the approved DS-8 lightweight radial theme.");
expect(!/sncbt-dashboard-canvas[\s\S]{0,900}(?:filter:\s*blur\(|backdrop-filter:)/.test(css), "Authenticated product canvas must keep DS-8 gradients lightweight and blur-free.");
expect(!/sncbt-sidebar-surface[\s\S]{0,250}backdrop-filter:\s*blur\(/.test(css), "Sidebar foundation reintroduced expensive backdrop blur.");

for (const fragment of [
  'primary: "emerald"',
  'neutral: "slate"',
  'rounded-xl border border-default/80 bg-default',
  'rounded-lg font-medium',
  'base: "rounded-md font-medium"',
]) {
  expect(appConfig.includes(fragment), `Nuxt UI foundation fragment missing: ${fragment}`);
}

expect(constants.includes('SNCBT_DESIGN_SYSTEM_VERSION = "2.0-ds4"'), "Typed DS version is missing.");
expect(constants.includes("minimumSupportedViewportPx: 320"), "320px mobile support contract is missing.");
expect(constants.includes("touchTargetPx: 44"), "44px typed touch target is missing.");
expect(docs.includes("All routes are in scope"), "Whole-system route coverage rule is missing from design-system documentation.");
expect(docs.includes("67 Vue page files"), "Current route/page inventory baseline is missing from documentation.");
expect(nuxt.includes('css: ["~/assets/css/main.css"]'), "Global design-system CSS is not loaded by Nuxt.");

const pageRoot = resolve(root, "app/pages");
const pages = walk(pageRoot).filter((file) => file.endsWith(".vue"));
expect(pages.length === 69, `Expected 69 Vue page files, found ${pages.length}. A DS foundation patch must not add/remove application pages.`);

const pageGroups = {
  admin: pages.filter((file) => relative(pageRoot, file).startsWith(`admin${process.platform === "win32" ? "\\" : "/"}`)).length,
  librarian: pages.filter((file) => relative(pageRoot, file).startsWith(`librarian${process.platform === "win32" ? "\\" : "/"}`)).length,
  student: pages.filter((file) => relative(pageRoot, file).startsWith(`student${process.platform === "win32" ? "\\" : "/"}`)).length,
  faculty: pages.filter((file) => relative(pageRoot, file).startsWith(`faculty${process.platform === "win32" ? "\\" : "/"}`)).length,
};
expect(pageGroups.admin === 22, `Admin page inventory changed: ${pageGroups.admin}`);
expect(pageGroups.librarian === 26, `Librarian page inventory changed: ${pageGroups.librarian}`);
expect(pageGroups.student === 10, `Student page inventory changed: ${pageGroups.student}`);
expect(pageGroups.faculty === 7, `Faculty page inventory changed: ${pageGroups.faculty}`);

if (!process.exitCode) {
  console.log("SNCBT Design System v2 DS-1 foundation verification passed.");
  console.log(`Page coverage preserved: ${pages.length} Vue pages (Admin ${pageGroups.admin}, Librarian ${pageGroups.librarian}, Student ${pageGroups.student}, Faculty ${pageGroups.faculty}, shared/public 3).`);
}
