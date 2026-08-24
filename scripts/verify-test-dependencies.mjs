import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const all = { ...pkg.dependencies, ...pkg.devDependencies };
const required = ["@nuxt/test-utils", "vitest", "@vue/test-utils", "happy-dom", "playwright-core"];
const missing = required.filter((name) => !all[name]);

if (missing.length) {
  console.error(`Missing test dependencies: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Required Nuxt/Vitest/browser test dependencies are installed.");
