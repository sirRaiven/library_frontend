import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAcceptanceHarness } from "./helpers/harness";
import { getAcceptanceEnv } from "./helpers/env";
import { auditInteractiveControls, assertNoHorizontalOverflow } from "./helpers/ui-audit";

const env = getAcceptanceEnv();
const harness = createAcceptanceHarness(env);

describe("Phase 27 authentication and entry workflows", () => {
  beforeAll(() => harness.start());
  afterAll(() => harness.stop());

  it("renders the sign-in form and password visibility control", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      await harness.goto(page, "/");
      await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
      const password = page.getByPlaceholder("Enter password");
      const passwordType = () => password.evaluate((element) => (element as HTMLInputElement).type);
      expect(await passwordType()).toBe("password");
      await page.getByRole("button", { name: "Show password" }).click();
      await expect.poll(
        passwordType,
        { timeout: Math.min(env.timeoutMs, 5_000), interval: 100 },
      ).toBe("text");
      await auditInteractiveControls(page);
      await assertNoHorizontalOverflow(page);
      guard.assertClean();
    } finally {
      await testPage.close();
    }
  });

  it("shows a safe message for invalid credentials", async () => {
    const testPage = await harness.newPage({
      allowedHttpFailures: [{ pattern: /\/api\/auth\/local(?:\?|$)/, statuses: [400, 401] }],
      allowedConsoleErrors: [/Failed to load resource.*(?:400|401)/i],
    });
    try {
      const { page, guard } = testPage;
      await harness.goto(page, "/");
      await page.getByPlaceholder("Enter email or username").fill("e2e-invalid-user");
      await page.getByPlaceholder("Enter password").fill("not-a-real-password-123");
      const authResponsePromise = page.waitForResponse((response) =>
        /\/api\/auth\/local(?:\?|$)/.test(response.url()) && response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Sign In", exact: true }).click();
      const authResponse = await authResponsePromise;
      expect([400, 401]).toContain(authResponse.status());
      await page.getByText("Unable to sign in", { exact: true }).waitFor();
      expect(new URL(page.url()).pathname).toBe("/");
      guard.assertClean();
    } finally {
      await testPage.close();
    }
  });

  it("redirects direct protected-route access back to sign-in", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      for (const path of ["/admin/dashboard", "/librarian/dashboard", "/student/dashboard", "/faculty/dashboard"]) {
        await harness.goto(page, path);
        await page.waitForURL((url) => url.pathname === "/", { timeout: env.timeoutMs });
        expect(new URL(page.url()).searchParams.get("redirect")).toBe(path);
      }
      guard.assertClean();
    } finally {
      await testPage.close();
    }
  });

  it("validates public Student Registration before any submission", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      let submitted = false;
      page.on("request", (request) => {
        if (request.method() === "POST" && /student-registration/i.test(request.url())) submitted = true;
      });
      await harness.goto(page, "/student-registration");
      const submit = page.getByRole("button", { name: "Submit Registration for Approval" });
      if (await submit.isDisabled()) {
        expect(await submit.isVisible()).toBe(true);
      } else {
        await submit.click();
        await page.waitForTimeout(250);
      }
      expect(submitted).toBe(false);
      expect(new URL(page.url()).pathname).toBe("/student-registration");
      guard.assertClean();
    } finally {
      await testPage.close();
    }
  });

  it("redirects the Faculty Access compatibility entry through the protected Faculty dashboard", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      await harness.goto(page, "/faculty-access");
      await page.waitForURL((url) => url.pathname === "/", { timeout: env.timeoutMs });
      expect(new URL(page.url()).searchParams.get("redirect")).toBe("/faculty/dashboard");
      guard.assertClean();
    } finally {
      await testPage.close();
    }
  });
});
