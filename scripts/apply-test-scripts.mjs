import { readFile, writeFile } from "node:fs/promises";

const packagePath = new URL("../package.json", import.meta.url);
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

packageJson.scripts ??= {};
Object.assign(packageJson.scripts, {
  test: "vitest run",
  "test:watch": "vitest",
  "test:unit": "vitest run --project unit",
  "test:nuxt": "vitest run --project nuxt",
});

await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log("SNCBT test scripts added to package.json without changing dependencies.");
