import fs from "node:fs";
import ts from "typescript";

const file = "app/layouts/admin.vue";
const source = fs.readFileSync(file, "utf8");
const match = source.match(/<script setup(?:\s+lang="ts")?>([\s\S]*?)<\/script>/);
if (!match) {
  console.error("Administrator layout compile check FAILED: <script setup> block not found.");
  process.exit(1);
}

const result = ts.transpileModule(match[1], {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
  reportDiagnostics: true,
  fileName: file,
});

const diagnostics = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
if (diagnostics.length) {
  const host = {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  };
  console.error("Administrator layout compile check FAILED:\n" + ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
  process.exit(1);
}

for (const label of [
  "Library Operations",
  "Library Settings",
  "Activity Log",
  "Sessions",
  "Devices",
  "Data Management",
  "Archive",
  "System & Maintenance",
]) {
  if (!source.includes(`label: "${label}"`)) {
    console.error(`Administrator layout compile check FAILED: missing navigation label ${label}.`);
    process.exit(1);
  }
}

console.log("Administrator layout compile/navigation check passed.");
