import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const fail = (message) => {
  console.error(`Admin v3.2.2 regression reconciliation FAILED: ${message}`);
  process.exit(1);
};

const layout = read("app/layouts/admin.vue");
for (const label of [
  "Library Operations",
  "Activity Log",
  "Sessions",
  "Devices",
  "Data Management",
  "Archive",
  "System & Maintenance",
]) {
  if (!layout.includes(`label: "${label}"`)) fail(`navigation label ${label} is missing.`);
}

function vueFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? vueFiles(full) : entry.name.endsWith(".vue") ? [full] : [];
  });
}

const pages = vueFiles(path.join(root, "app/pages"));
const adminPages = vueFiles(path.join(root, "app/pages/admin"));
if (pages.length !== 69) fail(`expected 69 Vue pages, found ${pages.length}.`);
if (adminPages.length !== 23) fail(`expected 23 Administrator pages, found ${adminPages.length}.`);

const buttonPattern = /<UButton\b(?:(?!\/>|<\/UButton>).)*?@click\s*=\s*"([^"]+)"(?:(?!\/>|<\/UButton>).)*?(?:\/>|<\/UButton>)/gs;
const assignment = /(?<![=!<>])=(?!=)/;
const violations = [];
for (const file of vueFiles(path.join(root, "app"))) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(buttonPattern)) {
    const expression = match[1].replace(/\s+/g, " ").trim();
    if (!expression.includes("=>") && assignment.test(expression)) {
      violations.push(`${path.relative(root, file)}: ${expression}`);
    }
  }
}
if (violations.length) fail(`UButton assignment handlers remain:\n- ${violations.join("\n- ")}`);

console.log("Admin v3.2.2 regression reconciliation passed.");
