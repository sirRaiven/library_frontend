import fs from "node:fs";

const failures = [];
const nuxt = fs.readFileSync(new URL("../nuxt.config.ts", import.meta.url), "utf8");
const auth = fs.readFileSync(new URL("../app/composables/useAuth.ts", import.meta.url), "utf8");
const touchTargets = [
  new URL("../app/", import.meta.url),
];

for (const required of [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Cross-Origin-Opener-Policy",
]) {
  if (!nuxt.includes(required)) failures.push(`nuxt.config.ts is missing ${required}.`);
}
if (!nuxt.includes("isProduction") || !nuxt.includes("wasm-unsafe-eval")) failures.push("Production CSP barcode/WASM policy is missing.");
const productionScriptLine = nuxt.split(/\r?\n/).find((line) => line.includes("? \"'self' 'unsafe-inline'")) ?? "";
if (productionScriptLine.includes(" 'unsafe-eval'")) failures.push("Production script-src must not enable general unsafe-eval.");
if (!auth.includes('credentials: "include"')) failures.push("Authenticated requests must include credentials for the refresh cookie.");
if (!auth.includes('secure: import.meta.env.PROD')) failures.push("Frontend session/device cookies must become Secure in production.");

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    if (entry.isDirectory()) scan(full);
    else if (/\.(ts|vue)$/.test(entry.name)) {
      const source = fs.readFileSync(full, "utf8");
      if (source.includes("/session/touch")) failures.push(`Session touch regression found in ${full.pathname}.`);
    }
  }
}
scan(touchTargets[0]);

if (failures.length) {
  console.error("SNCBT frontend production security verification FAILED:\n");
  failures.forEach((item) => console.error(`  - ${item}`));
  process.exit(1);
}
console.log("SNCBT frontend production security verification PASSED.");
