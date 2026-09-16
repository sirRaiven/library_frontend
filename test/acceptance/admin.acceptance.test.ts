import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAcceptanceHarness } from "./helpers/harness";
import { getAcceptanceEnv } from "./helpers/env";

const env = getAcceptanceEnv();
const harness = createAcceptanceHarness(env);

describe.skipIf(!env.credentials.administrator)("Phase 31 Administrator Portal functional acceptance", () => {
  beforeAll(() => harness.start());
  afterAll(() => harness.stop());

  it("opens and cancels Add User without creating an account", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      let writes = 0;
      page.on("request", (request) => {
        if (request.method() === "POST" && /\/api\/admin-management\/users/.test(request.url())) writes += 1;
      });
      await harness.login(page, "administrator");
      await harness.goto(page, "/admin/users");
      await page.getByRole("button", { name: "Add User" }).click();
      await page.getByText("Temporary Password", { exact: true }).first().waitFor();
      await page.getByRole("button", { name: "Cancel", exact: true }).last().click();
      expect(writes).toBe(0);
      guard.assertClean();
    } finally {
      await testPage.close();
    }
  });

  it("reloads Library Settings and exposes the final Semester selector", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      await harness.login(page, "administrator");
      await harness.goto(page, "/admin/settings");
      await page.getByRole("button", { name: "Reload", exact: true }).click();
      await page.getByText("Current Semester", { exact: true }).waitFor();
      guard.assertClean();
    } finally {
      await testPage.close();
    }
  });

  it("validates Create Librarian before account creation", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      let writes = 0;
      page.on("request", (request) => {
        if (request.method() === "POST" && /librarian/i.test(request.url())) writes += 1;
      });
      await harness.login(page, "administrator");
      await harness.goto(page, "/admin/librarians/create");
      await page.getByRole("button", { name: "Create Librarian Account" }).click();
      await page.waitForTimeout(200);
      expect(writes).toBe(0);
      guard.assertClean();
    } finally {
      await testPage.close();
    }
  });
});
