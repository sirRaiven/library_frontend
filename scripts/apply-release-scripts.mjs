import { readFile, writeFile } from "node:fs/promises";

const packagePath = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(await readFile(packagePath, "utf8"));

pkg.scripts = {
  ...pkg.scripts,
  test: "vitest --run --project unit --project nuxt",
  "test:watch": "vitest --watch --project unit --project nuxt",
  "test:unit": "vitest --run --project unit",
  "test:nuxt": "vitest --run --project nuxt",
  "test:e2e:chromium": "vitest --run --project e2e-chromium",
  "test:e2e:firefox": "vitest --run --project e2e-firefox",
  "test:e2e:webkit": "vitest --run --project e2e-webkit",
  "test:e2e": "npm run test:e2e:chromium && npm run test:e2e:firefox && npm run test:e2e:webkit",
  "test:live": "vitest --run --project live",
  "test:regression": "npm run test:unit && npm run test:nuxt && npm run test:e2e:chromium",
  "test:full": "npm run test:unit && npm run test:nuxt && npm run test:e2e",
  "test:browsers:install": "playwright-core install chromium firefox webkit",
  "verify:test-dependencies": "node scripts/verify-test-dependencies.mjs",
  "verify:release-source": "node scripts/verify-release-source.mjs",
  "release:verify": "node scripts/run-release-verification.mjs"
};

await writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log("SNCBT release/test scripts merged into package.json without changing dependencies.");
