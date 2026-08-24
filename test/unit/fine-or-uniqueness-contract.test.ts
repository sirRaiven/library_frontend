import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("fine OR uniqueness contract", () => {
  it("checks OR availability before payment verification", () => {
    const composable = source("app/composables/useLibraryFines.ts");
    const page = source("app/pages/librarian/fines.vue");
    expect(composable).toContain("/api/library-fines/or-number/check");
    expect(page).toContain("checkPaymentOrNumber");
    expect(page).toContain("paymentOrAvailable === false");
  });
});
