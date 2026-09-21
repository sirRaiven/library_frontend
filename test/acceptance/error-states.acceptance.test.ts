import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAcceptanceHarness } from "./helpers/harness";
import { getAcceptanceEnv } from "./helpers/env";

const env = getAcceptanceEnv();
const harness = createAcceptanceHarness(env);
const statuses = [400, 403, 404, 409, 422, 500] as const;

describe.skipIf(!env.credentials.student)("Phase 32 validation and error-state acceptance", () => {
  beforeAll(() => harness.start());
  afterAll(() => harness.stop());

  for (const status of statuses) {
    it(`keeps Student Book errors user-friendly for HTTP ${status}`, async () => {
      const testPage = await harness.newPage({
        allowedHttpFailures: [{ pattern: /\/api\/student-portal\/books(?:\?|$)/, statuses: [status] }],
        allowedConsoleErrors: [new RegExp(`Failed to load resource.*${status}`, "i")],
      });
      try {
        const { page, guard } = testPage;
        await harness.login(page, "student");
        await page.route("**/api/student-portal/books**", async (route) => {
          await route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify({
              error: {
                status,
                name: "AcceptanceInjectedError",
                message: `Injected acceptance error ${status}`,
              },
            }),
          });
        });
        await harness.goto(page, "/student/books");
        await page.getByText("Book collection unavailable", { exact: true }).waitFor();
        const body = (await page.locator("body").innerText()).toLowerCase();
        expect(body).not.toContain("postgres");
        expect(body).not.toContain("stack trace");
        expect(body).not.toContain("node_modules");
        await guard.assertClean();
      } finally {
        await testPage.close();
      }
    });
  }

  it("handles an expired Student session without exposing a technical exception", async () => {
    const testPage = await harness.newPage({
      allowedHttpFailures: [
        { pattern: /\/api\/student-portal\/books(?:\?|$)/, statuses: [401] },
        { pattern: /\/api\/auth\/refresh(?:\?|$)/, statuses: [401, 403] },
      ],
      allowedConsoleErrors: [/Failed to load resource.*(?:401|403)/i],
    });
    try {
      const { page, guard } = testPage;
      await harness.login(page, "student");
      await page.route("**/api/student-portal/books**", (route) =>
        route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: { status: 401, message: "Expired" } }) }),
      );
      await page.route("**/api/auth/refresh**", (route) =>
        route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: { status: 401, message: "Expired" } }) }),
      );
      await harness.goto(page, "/student/books");
      await page.waitForTimeout(500);
      expect(["/", "/student/books"]).toContain(new URL(page.url()).pathname);
      await guard.assertClean();
    } finally {
      await testPage.close();
    }
  });
});
