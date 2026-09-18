import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const failures = [];
const warnings = [];
const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] || "0", 10);
if (nodeMajor < 22 || nodeMajor >= 25) failures.push(`Node ${process.versions.node} is outside the supported range >=22 <25.`);

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
const nuxt = readFileSync(resolve(process.cwd(), "nuxt.config.ts"), "utf8");
const auth = readFileSync(resolve(process.cwd(), "app/composables/useAuth.ts"), "utf8");
const audit = readFileSync(resolve(process.cwd(), "test/acceptance/helpers/ui-audit.ts"), "utf8");
const runtimeGuard = readFileSync(resolve(process.cwd(), "test/acceptance/helpers/runtime-guard.ts"), "utf8");

for (const browser of ["chromium", "firefox", "webkit"]) {
  if (!pkg.scripts?.[`test:e2e:${browser}`] && !pkg.scripts?.["test:acceptance:authenticated:cross-browser"]) {
    failures.push(`No configured browser-validation path for ${browser}.`);
  }
}
for (const route of ["/admin/**", "/librarian/**", "/student/**", "/faculty/**"]) {
  if (!nuxt.includes(`\"${route}\"`) || !nuxt.includes("ssr: false")) failures.push(`Protected portal client-rendering compatibility rule is missing for ${route}.`);
}
for (const token of ['credentials: "include"', 'secure: import.meta.env.PROD', 'X-Device-ID']) {
  if (!auth.includes(token)) failures.push(`Authentication compatibility requirement missing: ${token}.`);
}
for (const token of ["visible buttons must have an accessible name", "visible links must have a usable href", "hidden controls must not be keyboard reachable"]) {
  if (!audit.includes(token)) failures.push(`Runtime accessibility audit is missing: ${token}.`);
}
for (const token of ["pageerror", "requestfailed", "Unexpected browser/runtime issues"]) {
  if (!runtimeGuard.includes(token)) failures.push(`Runtime compatibility guard is missing: ${token}.`);
}
if (!pkg.engines?.node) warnings.push("package.json should declare the supported Node engine range.");

if (warnings.length) {
  console.warn("Frontend compatibility warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (failures.length) {
  console.error("SNCBT frontend production compatibility verification FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("SNCBT frontend production compatibility verification PASSED.");
