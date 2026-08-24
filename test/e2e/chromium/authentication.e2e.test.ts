import { createPage, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";

interface MockRole {
  type: "administrator" | "super-administrator" | "librarian" | "student" | "faculty";
  home: string;
  marker: string;
}

const roles: MockRole[] = [
  { type: "administrator", home: "/admin/dashboard", marker: "Administrator" },
  { type: "super-administrator", home: "/admin/dashboard", marker: "Super Administrator" },
  { type: "librarian", home: "/librarian/dashboard", marker: "Library Overview" },
  { type: "student", home: "/student/dashboard", marker: "Student Portal" },
  { type: "faculty", home: "/faculty/dashboard", marker: "Faculty Portal" },
];

describe("mocked authentication and role redirect", async () => {
  await setup({
    browser: true,
    browserOptions: { type: "chromium" },
    setupTimeout: 120_000,
  });

  for (const role of roles) {
    it(`signs in ${role.type} and routes to ${role.home}`, async () => {
      const page = await createPage("/");

      await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());

        if (url.pathname === "/api/auth/local") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              jwt: "mock-jwt",
              user: {
                id: 1,
                username: role.type,
                email: `${role.type}@example.invalid`,
                confirmed: true,
                blocked: false,
                provider: "local",
              },
            }),
          });
        }

        if (url.pathname === "/api/users/me") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: 1,
              username: role.type,
              email: `${role.type}@example.invalid`,
              confirmed: true,
              blocked: false,
              provider: "local",
              role: { id: 1, name: role.type, type: role.type },
            }),
          });
        }

        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "{}",
        });
      });

      await page.getByPlaceholder("Enter email or username").fill(role.type);
      await page.getByPlaceholder("Enter password").fill("test-password");
      await page.getByRole("button", { name: "Sign In" }).click();

      await page.waitForURL((url) => url.pathname === role.home, { timeout: 15_000 });
      expect(new URL(page.url()).pathname).toBe(role.home);
      await page.getByText(role.marker, { exact: false }).first().waitFor({ timeout: 10_000 });
    });
  }
});
