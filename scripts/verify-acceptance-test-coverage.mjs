import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const manifestPath = resolve(root, "test/acceptance/helpers/routes.ts");
if (!existsSync(manifestPath)) throw new Error("Acceptance route manifest is missing.");
const manifest = readFileSync(manifestPath, "utf8");

function vueFiles(folder) {
  const result = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) result.push(...vueFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".vue")) result.push(path);
  }
  return result;
}

function routeForPage(file) {
  let route = `/${relative(resolve(root, "app/pages"), file).replace(/\\/g, "/").replace(/\.vue$/, "")}`;
  route = route.replace(/\/index$/, "");
  return route || "/";
}

const protectedRoutes = [];
for (const role of ["admin", "librarian", "student", "faculty"]) {
  const folder = resolve(root, `app/pages/${role}`);
  if (!existsSync(folder)) throw new Error(`Protected page folder is missing: ${folder}`);
  protectedRoutes.push(...vueFiles(folder).map(routeForPage));
}

const missing = protectedRoutes.filter((route) => !manifest.includes(`"${route}"`));
for (const route of ["/", "/student-registration", "/faculty-access"]) {
  if (!manifest.includes(`"${route}"`)) missing.push(route);
}

if (missing.length) {
  throw new Error(`Acceptance route manifest is missing ${missing.length} route(s):\n${missing.map((route) => `- ${route}`).join("\n")}`);
}

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
for (const script of [
  "test:acceptance",
  "test:acceptance:local",
  "test:acceptance:local:write",
  "test:acceptance:cross-browser",
  "test:acceptance:release:local",
  "test:acceptance:staging",
  "test:acceptance:staging:chromium",
  "test:acceptance:production",
  "test:acceptance:production:chromium",
]) {
  if (!packageJson.scripts?.[script]) throw new Error(`Missing package script: ${script}`);
}

console.log("Acceptance route-definition coverage check passed:");
console.log(`  Protected page routes represented : ${protectedRoutes.length}`);
console.log("  Public routes represented         : 2 (/ and /student-registration)");
console.log("  Compatibility entry represented   : 1 (/faculty-access, protected redirect)");
console.log("  Coverage definition check only; no browser navigation has been executed.");
