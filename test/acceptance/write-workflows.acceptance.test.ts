import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Locator, Page } from "playwright-core";
import { assertTransactionalFixtures, assertWriteSafety, getAcceptanceEnv } from "./helpers/env";
import { createAcceptanceHarness } from "./helpers/harness";

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

async function cleanupReservation(page: Page): Promise<void> {
  await harness.goto(page, "/student/reservations");
  const cancelButtons = page.getByRole("button", { name: "Cancel Reservation", exact: true });
  const count = await cancelButtons.count();
  if (!count) return;
  if (count > 1) {
    throw new Error(
      `Reservation cleanup found ${count} cancellable reservations. The Phase 34 Student fixture must not have pre-existing active reservations.`,
    );
  }

  await cancelButtons.first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Cancel Reservation", exact: true }).click();
  await expect.poll(async () => await page.getByRole("button", { name: "Cancel Reservation", exact: true }).count()).toBe(0);
}

async function cleanupBorrowing(page: Page, options: { allowAlreadyClean?: boolean } = {}): Promise<void> {
  await harness.goto(page, "/librarian/return");
  await page.locator("#member-return-scanner").fill(env.fixtures.studentBarcode);
  await page.getByRole("button", { name: "Load Borrowed Books" }).click();
  await page.getByText("Member borrowing records loaded", { exact: true }).waitFor();

  const noActiveBorrowings = page.getByText("No active borrowed books", { exact: true });
  if (await noActiveBorrowings.isVisible().catch(() => false)) {
    if (options.allowAlreadyClean) return;
    throw new Error("Borrowing completed but the fixture Student has no active borrowed book to return.");
  }

  await page.locator("#book-return-scanner").fill(env.fixtures.availableBookBarcode);
  await page.getByRole("button", { name: "Verify Book" }).click();
  await page.getByText("Book verified", { exact: true }).waitFor();
  await page.getByRole("button", { name: /Return (?:All )?Verified/ }).click();

  const returnResult = page.locator('[data-slot="title"]').filter({
    hasText: /^(Returns completed|Some returns were completed)$/,
  });
  await returnResult.first().waitFor();
}

function rethrowWithCleanup(primaryError: unknown, cleanupError: unknown, label: string): never {
  if (primaryError && cleanupError) {
    throw new AggregateError([primaryError, cleanupError], `${label} failed and rollback also failed.`);
  }
  if (cleanupError) throw cleanupError;
  throw primaryError;
}

describe.skipIf(!env.allowWrites)("Phase 34 write-gated transactional acceptance", () => {
  beforeAll(async () => {
    assertTransactionalFixtures(env);
    assertWriteSafety(env);
    await harness.start();
  });
  afterAll(() => harness.stop());

  it("creates and cancels a Student reservation through the UI", async () => {
    const testPage = await harness.newPage();
    let reservationMayExist = false;
    let reservationClean = false;
    let primaryError: unknown = null;
    let cleanupError: unknown = null;

    try {
      const { page, guard } = testPage;
      await harness.login(page, "student");
      await harness.goto(page, "/student/reservations");

      const existingCancels = page.getByRole("button", { name: "Cancel Reservation", exact: true });
      expect(
        await existingCancels.count(),
        "The Phase 34 Student fixture must have no pre-existing active reservation before the test starts.",
      ).toBe(0);

      const open = page.getByRole("button", { name: /New Reservation|Create a Reservation/ }).first();
      const reservationState = await waitForReservationPolicy(page, open);
      expect(
        reservationState,
        "The Phase 34 Student fixture is currently blocked by reservation policy.",
      ).toBe("enabled");
      await open.click();
      const dialog = page.getByRole("dialog");
      await dialog.getByPlaceholder("Search title, author, ISBN, category, or call number").fill(env.fixtures.reservationBookQuery);
      await dialog.getByRole("button", { name: "Search Books" }).click();
      const selectable = dialog.locator("button").filter({ hasText: "Select" }).filter({ hasNotText: "Unavailable" }).first();
      await selectable.waitFor();
      await selectable.click();
      const create = dialog.getByRole("button", { name: /Create 1 Reservation/ });
      reservationMayExist = true;
      await create.click();

      const cancel = page.getByRole("button", { name: "Cancel Reservation", exact: true }).first();
      await cancel.waitFor();
      await cleanupReservation(page);
      reservationClean = true;
      guard.assertClean();
    } catch (error) {
      primaryError = error;
    } finally {
      if (reservationMayExist && !reservationClean) {
        try {
          await cleanupReservation(testPage.page);
          reservationClean = true;
        } catch (error) {
          cleanupError = error;
        }
      }
      await testPage.close();
    }

    if (primaryError || cleanupError) rethrowWithCleanup(primaryError, cleanupError, "Student reservation acceptance");
  });

  it("borrows and returns one physical copy through the Librarian circulation UI", async () => {
    const testPage = await harness.newPage();
    let borrowingMayExist = false;
    let borrowingClean = false;
    let primaryError: unknown = null;
    let cleanupError: unknown = null;

    try {
      const { page, guard } = testPage;
      await harness.login(page, "librarian");
      await harness.goto(page, "/librarian/borrow");

      const borrowScanner = page.locator("#borrow-scanner");
      await borrowScanner.fill(env.fixtures.studentBarcode);
      await page.getByRole("button", { name: "Process Scan" }).click();
      await page.getByText("Member verified", { exact: true }).waitFor();

      await borrowScanner.fill(env.fixtures.availableBookBarcode);
      await page.getByRole("button", { name: "Process Scan" }).click();
      await page.getByText("Book added", { exact: true }).waitFor();
      borrowingMayExist = true;
      await page.getByRole("button", { name: "Confirm Borrowing" }).click();
      await page.getByText("Borrowing completed", { exact: true }).waitFor();

      await cleanupBorrowing(page);
      borrowingClean = true;
      guard.assertClean();
    } catch (error) {
      primaryError = error;
    } finally {
      if (borrowingMayExist && !borrowingClean) {
        try {
          await cleanupBorrowing(testPage.page, { allowAlreadyClean: true });
          borrowingClean = true;
        } catch (error) {
          cleanupError = error;
        }
      }
      await testPage.close();
    }

    if (primaryError || cleanupError) rethrowWithCleanup(primaryError, cleanupError, "Librarian circulation acceptance");
  });
});
