import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertWriteSafety, getAcceptanceEnv } from "./helpers/env";
import { createAcceptanceHarness } from "./helpers/harness";

const env = getAcceptanceEnv();
const harness = createAcceptanceHarness(env);

describe.skipIf(!env.allowWrites)("Phase 34 write-gated transactional acceptance", () => {
  beforeAll(async () => {
    assertWriteSafety(env);
    await harness.start();
  });
  afterAll(() => harness.stop());

  it.skipIf(!env.credentials.student || !env.fixtures.reservationBookQuery)(
    "creates and cancels a Student reservation through the UI",
    async () => {
      const testPage = await harness.newPage();
      try {
        const { page, guard } = testPage;
        await harness.login(page, "student");
        await harness.goto(page, "/student/reservations");
        const open = page.getByRole("button", { name: /New Reservation|Create a Reservation/ }).first();
        expect(await open.isDisabled()).toBe(false);
        await open.click();
        const dialog = page.getByRole("dialog");
        await dialog.getByPlaceholder("Search title, author, ISBN, category, or call number").fill(env.fixtures.reservationBookQuery);
        await dialog.getByRole("button", { name: "Search Books" }).click();
        const selectable = dialog.locator("button").filter({ hasText: "Select" }).filter({ hasNotText: "Unavailable" }).first();
        await selectable.waitFor();
        await selectable.click();
        const create = dialog.getByRole("button", { name: /Create 1 Reservation/ });
        await create.click();
        await page.waitForTimeout(500);

        const cancel = page.getByRole("button", { name: "Cancel Reservation", exact: true }).first();
        await cancel.waitFor();
        await cancel.click();
        const confirm = page.getByRole("dialog").getByRole("button", { name: "Cancel Reservation", exact: true });
        await confirm.click();
        await page.waitForTimeout(500);
        guard.assertClean();
      } finally {
        await testPage.close();
      }
    },
  );

  it.skipIf(!env.credentials.librarian || !env.fixtures.studentBarcode || !env.fixtures.availableBookBarcode)(
    "borrows and returns one physical copy through the Librarian circulation UI",
    async () => {
      const testPage = await harness.newPage();
      let borrowed = false;
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
        await page.getByRole("button", { name: "Confirm Borrowing" }).click();
        await page.getByText("Borrowing completed", { exact: true }).waitFor();
        borrowed = true;

        await harness.goto(page, "/librarian/return");
        await page.locator("#member-return-scanner").fill(env.fixtures.studentBarcode);
        await page.getByRole("button", { name: "Load Borrowed Books" }).click();
        await page.getByText("Member borrowing records loaded", { exact: true }).waitFor();
        await page.locator("#book-return-scanner").fill(env.fixtures.availableBookBarcode);
        await page.getByRole("button", { name: "Verify Book" }).click();
        await page.getByText("Book verified", { exact: true }).waitFor();
        await page.getByRole("button", { name: /Return (?:All )?Verified/ }).click();
        await page.getByText(/Returns completed|Some returns were completed/, { exact: false }).waitFor();
        borrowed = false;
        guard.assertClean();
      } finally {
        if (borrowed) {
          console.error("E2E cleanup warning: the test borrowed a copy but did not complete the return. Run the return workflow manually for the configured fixture.");
        }
        await testPage.close();
      }
    },
  );
});
