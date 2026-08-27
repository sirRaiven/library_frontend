import { createPage, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";

type BrowserType = "chromium" | "firefox" | "webkit";

const browserSetupTimeout = process.platform === "win32" ? 240_000 : 180_000;

export function registerBrowserSmokeSuite(type: BrowserType) {
  describe(`${type} browser regression`, async () => {
    await setup({
      browser: true,
      browserOptions: { type },
      setupTimeout: browserSetupTimeout,
    });

    it("renders the sign-in UI", async () => {
      const page = await createPage("/");
      await page.getByRole("heading", { name: "Sign in to continue" }).waitFor();

      expect(await page.getByPlaceholder("Enter email or username").isVisible()).toBe(true);
      expect(await page.getByPlaceholder("Enter password").isVisible()).toBe(true);
      expect(await page.getByRole("button", { name: "Sign In" }).isVisible()).toBe(true);
      await page.close();
    });

    it("redirects an unauthenticated direct protected-route load to sign-in", async () => {
      for (const path of [
        "/admin/dashboard",
        "/librarian/dashboard",
        "/student/dashboard",
        "/faculty/dashboard",
      ]) {
        const page = await createPage(path);
        await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
        expect(new URL(page.url()).searchParams.get("redirect")).toBe(path);
        await page.close();
      }
    });

    it("has no horizontal overflow at a phone-sized viewport", async () => {
      const page = await createPage("/");
      await page.setViewportSize({ width: 360, height: 800 });
      await page.getByRole("heading", { name: "Sign in to continue" }).waitFor();

      const sizes = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));

      expect(sizes.documentWidth).toBeLessThanOrEqual(sizes.innerWidth + 1);
      await page.close();
    });

    it("keeps the public registration route reachable", async () => {
      const page = await createPage("/student-registration");
      expect(new URL(page.url()).pathname).toBe("/student-registration");
      await page.close();
    });
  });
}
