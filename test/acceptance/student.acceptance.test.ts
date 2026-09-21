import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Locator, Page } from "playwright-core";
import { createAcceptanceHarness } from "./helpers/harness";
import { getAcceptanceEnv } from "./helpers/env";

const env = getAcceptanceEnv();
const harness = createAcceptanceHarness(env);

async function waitForReservationPolicy(page: Page, open: Locator): Promise<"enabled" | "blocked"> {
  const warning = page.getByText("New reservations are currently unavailable", { exact: false });
  const deadline = Date.now() + env.timeoutMs;

  while (Date.now() < deadline) {
    if (!(await open.isDisabled())) return "enabled";
    if (await warning.isVisible().catch(() => false)) return "blocked";
    await page.waitForTimeout(100);
  }

  throw new Error("Reservation policy did not become ready before the acceptance timeout.");
}

describe.skipIf(!env.credentials.student)("Phase 28 Student Portal functional acceptance", () => {
  beforeAll(() => harness.start());
  afterAll(() => harness.stop());

  it("searches the Book Collection without persisting data", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      await harness.login(page, "student");
      await harness.goto(page, "/student/books");
      const search = page.getByPlaceholder(/search/i).first();
      await search.fill("information");
      await page.waitForTimeout(500);
      await search.fill("");
      await guard.assertClean();
    } finally {
      await testPage.close();
    }
  });

  it("opens and closes New Reservation without creating a record", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      let postCount = 0;
      page.on("request", (request) => {
        if (request.method() === "POST" && /reservation/i.test(request.url())) postCount += 1;
      });
      await harness.login(page, "student");
      await harness.goto(page, "/student/reservations");
      const open = page.getByRole("button", { name: /New Reservation|Create a Reservation/ }).first();
      const reservationState = await waitForReservationPolicy(page, open);
      if (reservationState === "blocked") {
        expect(await page.getByText("New reservations are currently unavailable", { exact: false }).isVisible()).toBe(true);
      } else {
        await open.click();
        await page.getByRole("heading", { name: "Create New Reservation" }).waitFor();
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
      }
      expect(postCount).toBe(0);
      await guard.assertClean();
    } finally {
      await testPage.close();
    }
  });

  it("does not submit an empty password change", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      let passwordWrites = 0;
      page.on("request", (request) => {
        if (request.method() !== "GET" && /password/i.test(request.url())) passwordWrites += 1;
      });
      await harness.login(page, "student");
      await harness.goto(page, "/student/security");
      await page.getByRole("button", { name: "Change Password", exact: true }).click();
      const changePassword = page.getByRole("button", { name: "Change Password and Sign Out" });
      await changePassword.waitFor();
      expect(await changePassword.isDisabled()).toBe(true);
      expect(passwordWrites).toBe(0);
      await guard.assertClean();
    } finally {
      await testPage.close();
    }
  });
});
