import fs from "node:fs";
import path from "node:path";

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const result = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    result[match[1]] = value;
  }
  return result;
}

const cwd = process.cwd();
const localEnv = parseDotEnv(path.join(cwd, ".env"));
const raw = String(
  process.env.NUXT_PUBLIC_STRAPI_URL ?? localEnv.NUXT_PUBLIC_STRAPI_URL ?? "",
)
  .trim()
  .replace(/\/+$/, "");

const failures = [];

if (raw) {
  if (raw.startsWith("/")) {
    failures.push(
      "NUXT_PUBLIC_STRAPI_URL must be empty for same-origin deployment; do not use /api.",
    );
  } else {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== "https:") {
        failures.push(
          "Production NUXT_PUBLIC_STRAPI_URL must use HTTPS. For same-origin /api and /uploads reverse proxying, leave NUXT_PUBLIC_STRAPI_URL empty.",
        );
      }
      if (
        parsed.pathname !== "/" ||
        parsed.search ||
        parsed.hash ||
        parsed.username ||
        parsed.password
      ) {
        failures.push(
          "NUXT_PUBLIC_STRAPI_URL must be an origin only, for example https://api.example.edu, with no /api path, query, fragment, or credentials.",
        );
      }
    } catch {
      failures.push(
        "NUXT_PUBLIC_STRAPI_URL must be empty or an absolute HTTPS origin.",
      );
    }
  }
}

if (failures.length) {
  console.error("\nSNCBT production environment verification FAILED:\n");
  for (const item of failures) console.error(`  - ${item}`);
  console.error(
    "\nLocal development may continue with http://localhost:1337. Fix the production deployment environment before release.\n",
  );
  process.exit(1);
}

console.log(
  raw
    ? `SNCBT production environment verification passed: ${raw}`
    : "SNCBT production environment verification passed: same-origin /api and /uploads expected.",
);
