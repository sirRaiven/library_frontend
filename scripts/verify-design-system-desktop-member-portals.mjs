import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const css = read("app/assets/css/main.css");
const student = read("app/layouts/student.vue");
const faculty = read("app/layouts/faculty.vue");

for (const [role, source] of [["Student", student], ["Faculty", faculty]]) {
  if (!source.includes('class="sncbt-mobile-bottom-nav-spacer')) {
    console.error(`DS-8.3.1 desktop member portal verification failed: ${role} main content lost the mobile clearance marker.`);
    process.exit(1);
  }
  if (!source.includes('<div class="sncbt-portal-view">')) {
    console.error(`DS-8.3.1 desktop member portal verification failed: ${role} portal view wrapper is missing.`);
    process.exit(1);
  }
}

const badDesktopRule = /@media\s*\(min-width:\s*1024px\)[\s\S]{0,500}\.sncbt-mobile-bottom-nav\s*,\s*\.sncbt-mobile-bottom-nav-spacer\s*\{\s*display:\s*none\s*!important\s*;/;
if (badDesktopRule.test(css)) {
  console.error("DS-8.3.1 desktop member portal verification failed: desktop CSS still hides the Student/Faculty <main> element together with the mobile navigation.");
  process.exit(1);
}

const desktopBlock = css.match(/@media\s*\(min-width:\s*1024px\)\s*\{[\s\S]*?\n\}/g)?.find((block) =>
  block.includes(".sncbt-mobile-bottom-nav") && block.includes(".sncbt-mobile-bottom-nav-spacer")
);

if (!desktopBlock) {
  console.error("DS-8.3.1 desktop member portal verification failed: desktop bottom-navigation rule was not found.");
  process.exit(1);
}

for (const token of [
  ".sncbt-mobile-bottom-nav {",
  "display: none !important;",
  ".sncbt-mobile-bottom-nav-spacer {",
  "display: block !important;",
  "padding-bottom: 0;",
]) {
  if (!desktopBlock.includes(token)) {
    console.error(`DS-8.3.1 desktop member portal verification failed: desktop rule is missing ${token}`);
    process.exit(1);
  }
}

if (!css.includes(".sncbt-mobile-bottom-nav-spacer::after")) {
  console.error("DS-8.3.1 desktop member portal verification failed: mobile safe-area flow spacer was removed.");
  process.exit(1);
}

console.log("DS-8.3.1 desktop Student/Faculty portal visibility verification passed.");
console.log("Desktop hides only the fixed mobile navigation; Student and Faculty main content remains rendered at >=1024px.");
