import { afterAll, beforeAll, describe, it } from "vitest";
import { createAcceptanceHarness } from "./helpers/harness";
import { getAcceptanceEnv } from "./helpers/env";

const env = getAcceptanceEnv();
const harness = createAcceptanceHarness(env);

describe.skipIf(!env.credentials.faculty)("Phase 30 Faculty Portal functional acceptance", () => {
  beforeAll(() => harness.start());
  afterAll(() => harness.stop());

  it("searches the shared Faculty Book Collection", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      await harness.login(page, "faculty");
      await harness.goto(page, "/faculty/books");
      const search = page.getByPlaceholder(/search/i).first();
      await search.fill("information");
      await page.waitForTimeout(450);
      await search.fill("");
      guard.assertClean();
    } finally {
      await testPage.close();
    }
  });

  it("refreshes Faculty reports without a runtime error", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      await harness.login(page, "faculty");
      await harness.goto(page, "/faculty/reports");
      await page.getByRole("button", { name: "Refresh", exact: true }).click();
      await page.waitForTimeout(300);
      guard.assertClean();
    } finally {
      await testPage.close();
    }
  });
});
