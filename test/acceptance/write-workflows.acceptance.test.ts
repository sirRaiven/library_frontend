import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Locator, Page } from "playwright-core";
import { assertTransactionalFixtures, assertWriteSafety, getAcceptanceEnv } from "./helpers/env";
import { createAcceptanceHarness } from "./helpers/harness";

const env = getAcceptanceEnv();
const harness = createAcceptanceHarness(env);

interface ReservationSearchCandidate {
  documentId: string;
  title: string;
  author?: string;
  canSelect: boolean;
  selectionReason?: string | null;
  availability?: {
    availableCopies?: number;
    totalCopies?: number;
  };
}

interface ReservationSearchResponse {
  data?: ReservationSearchCandidate[];
}

function reservationSearchDiagnostic(
  query: string,
  candidates: ReservationSearchCandidate[],
): string {
  if (!candidates.length) {
    return `No selectable reservation title was returned for query "${query}" because the search returned no book titles.`;
  }

  const duplicateReservation = candidates.find((book) =>
    !book.canSelect && /already have an active reservation/i.test(book.selectionReason ?? ""),
  );
  if (duplicateReservation) {
    return [
      `The configured Phase 34 Student already has an active reservation for "${duplicateReservation.title}".`,
      "This is fixture state, not a reservation-creation failure.",
      "Clean that test reservation in the Librarian Reservations page (including Ready for Pickup records), or use another dedicated Student/title fixture before rerunning write acceptance.",
      "Do not repeatedly rerun the write suite while this active reservation remains.",
    ].join("\n");
  }

  const details = candidates.slice(0, 5).map((book) => {
    const availability = book.availability
      ? `${book.availability.availableCopies ?? 0}/${book.availability.totalCopies ?? 0} copies available`
      : "availability not reported";
    const reason = book.selectionReason?.trim() || (book.canSelect ? "selectable" : "no selection reason reported");
    return `${book.title} [${availability}; ${reason}]`;
  });

  return [
    `No selectable reservation title was returned for query "${query}".`,
    "Search results:",
    ...details.map(detail => `- ${detail}`),
  ].join("\n");
}

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
      const searchResponsePromise = page.waitForResponse((response) =>
        /\/api\/student-portal\/reservation-books(?:\?|$)/.test(response.url()) && response.request().method() === "GET",
      );
      await dialog.getByRole("button", { name: "Search Books" }).click();
      const searchResponse = await searchResponsePromise;
      expect(
        searchResponse.status(),
        `Reservation-book search returned HTTP ${searchResponse.status()} for query "${env.fixtures.reservationBookQuery}".`,
      ).toBe(200);

      let searchPayload: ReservationSearchResponse = {};
      try {
        searchPayload = await searchResponse.json() as ReservationSearchResponse;
      } catch {
        throw new Error("Reservation-book search returned HTTP 200 but the response body was not valid JSON.");
      }

      const candidates = Array.isArray(searchPayload.data) ? searchPayload.data : [];
      const query = env.fixtures.reservationBookQuery.trim().toLowerCase();
      const candidate = candidates.find(
        book => book.canSelect && book.title.trim().toLowerCase() === query,
      ) ?? candidates.find(book => book.canSelect);

      if (!candidate) {
        throw new Error(reservationSearchDiagnostic(env.fixtures.reservationBookQuery, candidates));
      }

      const selectable = dialog.locator("button").filter({ hasText: candidate.title }).first();
      await selectable.waitFor();
      await selectable.click();
      const create = dialog.getByRole("button", { name: /Create 1 Reservation/ });
      await create.waitFor();
      expect(await create.isDisabled(), `Selectable reservation title "${candidate.title}" did not enable creation.`).toBe(false);
      reservationMayExist = true;
      await create.click();

      const cancel = page.getByRole("button", { name: "Cancel Reservation", exact: true }).first();
      await cancel.waitFor();
      await cleanupReservation(page);
      reservationClean = true;
      await guard.assertClean();
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
      await guard.assertClean();
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
