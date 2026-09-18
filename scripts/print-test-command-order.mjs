import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(process.cwd(), "docs/TEST_COMMAND_ORDER.md");
console.log(readFileSync(file, "utf8"));
