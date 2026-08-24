import { access, copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const candidates = [
  path.join(projectRoot, "node_modules", "zxing-wasm", "dist", "reader", "zxing_reader.wasm"),
  path.join(
    projectRoot,
    "node_modules",
    "barcode-detector",
    "node_modules",
    "zxing-wasm",
    "dist",
    "reader",
    "zxing_reader.wasm",
  ),
];

let source = "";
for (const candidate of candidates) {
  try {
    await access(candidate);
    source = candidate;
    break;
  } catch {
    // Try the next dependency layout.
  }
}

if (!source) {
  throw new Error(
    "Unable to locate zxing_reader.wasm. Run npm install with vue-qrcode-reader dependencies intact.",
  );
}

const packageJsonPath = source.slice(0, source.indexOf(`${path.sep}dist${path.sep}`)) + `${path.sep}package.json`;
let resolvedVersion = "unknown";
try {
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  resolvedVersion = String(packageJson.version ?? "unknown");
} catch {
  // Version is diagnostic only; copying the exact installed binary is what matters.
}

const destinationDirectory = path.join(projectRoot, "public", "barcode");
const destination = path.join(destinationDirectory, "zxing_reader.wasm");
await mkdir(destinationDirectory, { recursive: true });
await copyFile(source, destination);

console.log(`Self-hosted barcode WASM prepared from zxing-wasm ${resolvedVersion}: public/barcode/zxing_reader.wasm`);
