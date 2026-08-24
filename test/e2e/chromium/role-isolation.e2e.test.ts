import { createPage, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";

interface RoleCase {
  role: "administrator" | "librarian" | "student" | "faculty";
  requested: string;
  expectedHome: string;
}

const cases: RoleCase[] = [
  { role: "student", requested: "/admin/dashboard", expectedHome: "/student/dashboard" },
  { role: "librarian", requested: "/student/dashboard", expectedHome: "/librarian/dashboard" },
  { role: "student", requested: "/faculty/dashboard", expectedHome: "/student/dashboard" },
  { role: "faculty", requested: "/librarian/dashboard", expectedHome: "/faculty/dashboard" },
];

describe("authenticated hard-load role isolation", async () => {
  await setup({
    browser: true,
    browserOptions: { type: "chromium" },
    setupTimeout: 120_000,
  });

  for (const testCase of cases) {
    it(`${testCase.role} cannot stay on ${testCase.requested} after session refresh`, async () => {
      const page = await createPage("/");
      const origin = new URL(page.url()).origin;

      await page.context().addCookies([
        {
          name: "auth-session-hint",
          value: "1",
          url: origin,
          sameSite: "Lax",
        },
      ]);

      await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());

        if (url.pathname === "/api/auth/refresh") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ jwt: "refreshed-jwt" }),
          });
        }

        if (url.pathname === "/api/users/me") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: 7,
              username: testCase.role,
              email: `${testCase.role}@example.invalid`,
              confirmed: true,
              blocked: false,
              provider: "local",
              role: { id: 1, name: testCase.role, type: testCase.role },
            }),
          });
        }

        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      });

      await page.goto(`${origin}${testCase.requested}`);
      await page.waitForURL((url) => url.pathname === testCase.expectedHome, { timeout: 15_000 });
      expect(new URL(page.url()).pathname).toBe(testCase.expectedHome);
    });
  }
});
