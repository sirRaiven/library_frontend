import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "app/pages/admin/archive.vue"), "utf8");
const fail = (message) => {
  console.error(`Admin Archive dialog verification FAILED: ${message}`);
  process.exit(1);
};

if (!source.includes('<UModal v-model:open="restoreOpen"')) fail("restore action is not wrapped in UModal.");
if (!source.includes('<UModal v-model:open="deleteOpen"')) fail("permanent-delete action is not wrapped in UModal.");
if ((source.match(/<template #actions>/g) || []).length < 2) fail("restore/delete dialog action footers are missing.");
if (source.includes('<AppDialogFrame v-model:open=')) fail("AppDialogFrame must not be used as a modal controller.");
if (source.includes('<template #footer>')) fail("AppDialogFrame uses the actions slot, not footer.");
if (!source.includes('@click="permanentlyDelete"')) fail("permanent-delete button is not wired to the mutation handler.");
if (!source.includes('@click="restoreRecord"')) fail("restore button is not wired to the restore handler.");
if (!source.includes('confirmationMatches')) fail("confirmation validation feedback is missing.");
if (!source.includes('deleteReasonValid')) fail("deletion-reason validation feedback is missing.");

console.log("Admin Archive dialog verification passed.");
