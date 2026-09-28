import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "app/pages/admin/archive.vue"), "utf8");

describe("Admin Archive dialog hotfix", () => {
  it("uses Nuxt UI modal containers for restore and permanent deletion", () => {
    expect(source).toContain('<UModal v-model:open="restoreOpen"');
    expect(source).toContain('<UModal v-model:open="deleteOpen"');
  });

  it("uses AppDialogFrame action slots so confirmation buttons render", () => {
    expect(source.match(/<template #actions>/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain("<template #footer>");
  });

  it("wires the visible buttons to restore and permanent-delete handlers", () => {
    expect(source).toContain('@click="restoreRecord"');
    expect(source).toContain('@click="permanentlyDelete"');
  });

  it("keeps destructive confirmation validation visible", () => {
    expect(source).toContain("confirmationMatches");
    expect(source).toContain("deleteReasonValid");
    expect(source).toContain("The confirmation phrase must match exactly.");
  });
});
