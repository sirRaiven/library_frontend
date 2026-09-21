import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAcceptanceHarness } from "./helpers/harness";
import { getAcceptanceEnv } from "./helpers/env";

const env = getAcceptanceEnv();
const harness = createAcceptanceHarness(env);

describe.skipIf(!env.credentials.librarian)("Phase 29 Librarian Portal functional acceptance", () => {
  beforeAll(() => harness.start());
  afterAll(() => harness.stop());

  it("loads the membership term once and does not refetch it when Register Student opens", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      let termReads = 0;
      page.on("response", (response) => {
        if (response.request().method() === "GET" && /\/api\/library-memberships\/term(?:\?|$)/.test(response.url())) {
          termReads += 1;
          expect(response.status()).toBeLessThan(400);
        }
      });
      await harness.login(page, "librarian");
      await harness.goto(page, "/librarian/students");
      await page.getByRole("button", { name: "Register Student" }).waitFor();
      await page.waitForTimeout(350);
      const beforeOpen = termReads;
      expect(beforeOpen).toBeGreaterThan(0);
      await page.getByRole("button", { name: "Register Student" }).click();
      await page.getByText("Student Number", { exact: true }).first().waitFor();
      await page.waitForTimeout(350);
      expect(termReads).toBe(beforeOpen);
      await page.getByRole("button", { name: "Cancel", exact: true }).last().click();
      await guard.assertClean();
    } finally {
      await testPage.close();
    }
  });

  it("blocks empty Book Registration before the create API", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      let writes = 0;
      page.on("request", (request) => {
        if (request.method() === "POST" && /\/api\/books\/register-with-copies/.test(request.url())) writes += 1;
      });
      await harness.login(page, "librarian");
      await harness.goto(page, "/librarian/books/register");
      const register = page.getByRole("button", { name: "Register & View Barcodes" });
      expect(await register.isDisabled()).toBe(true);
      expect(writes).toBe(0);
      await guard.assertClean();
    } finally {
      await testPage.close();
    }
  });

  it("generates the Excel import template from current registry options", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      await harness.login(page, "librarian");
      await harness.goto(page, "/librarian/books/import");
      const timeout = Math.max(env.timeoutMs, 90_000);
      const downloadPromise = page
        .waitForEvent("download", { timeout })
        .then((download) => ({ kind: "download" as const, download }));
      const templateFailure = page.getByText("Template download failed", { exact: true });
      const templateFailurePromise = templateFailure
        .waitFor({ timeout })
        .then(async () => ({
          kind: "error" as const,
          details: await templateFailure.locator("xpath=../..").innerText().catch(() => "Template download failed"),
        }));

      await page.getByRole("button", { name: "Download Template" }).click();

      const result = await Promise.race([downloadPromise, templateFailurePromise]);
      if (result.kind === "error") {
        throw new Error(
          `The production Excel template generator reported an application error before a browser download began. UI message: ${result.details}`,
        );
      }

      expect(result.download.suggestedFilename()).toMatch(/SNCBT-Library-Inventory-Import-Template.*\.xlsx$/i);
      await guard.assertClean();
    } finally {
      await testPage.close();
    }
  });

  it("loads and refreshes the Membership Term editor", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      await harness.login(page, "librarian");
      await harness.goto(page, "/librarian/membership-term");
      await page.getByText("Academic Year", { exact: true }).first().waitFor();
      const refresh = page.getByRole("button", { name: "Refresh", exact: true });
      await refresh.click();
      await page.waitForTimeout(250);
      await guard.assertClean();
    } finally {
      await testPage.close();
    }
  });
});
