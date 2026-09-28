import { createPage, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";

interface MockRole {
  type: "administrator" | "super-administrator" | "librarian" | "student" | "faculty";
  home: string;
  marker: string;
}

const adminDashboardData = {
  generatedAt: "",
  metrics: {
    totalUsers: 0, activeUsers: 0, blockedUsers: 0, unconfirmedUsers: 0,
    totalRoles: 0, totalLibrarians: 0, activeLibrarians: 0,
    totalStudents: 0, totalFaculty: 0, totalBooks: 0, totalCopies: 0,
    borrowedCopies: 0, overdueTransactions: 0, pendingReservations: 0,
    visitorsToday: 0,
  },
  system: {
    api: "Operational",
    database: "Operational",
    authentication: "Operational",
    timezone: "Asia/Manila",
  },
  recentActivity: [],
};

const studentDashboardData = {
  generatedAt: "",
  student: null,
  membership: {
    documentId: null, membershipNo: null, academicYear: null, semester: null,
    issuedDate: null, expiryDate: null, status: "Checking",
    enrollmentVerified: false, daysRemaining: null, isActive: false,
  },
  metrics: {
    currentLoans: 0, overdueLoans: 0, dueSoonLoans: 0,
    activeReservations: 0, attentionItems: 0,
  },
  currentLoans: [],
  activeReservations: [],
  notices: [],
};

const facultyDashboardData = {
  generatedAt: "",
  faculty: null,
  policy: {
    finePolicy: "Faculty loans do not receive monetary fines.",
    replacementPolicy: "Lost books must be replaced with a new acceptable copy.",
    loanPeriod: "Due dates follow the annual department cycle or an earlier audit schedule.",
  },
  metrics: {
    currentLoans: 0, reviewDueSoon: 0, lostForReplacement: 0, openReports: 0,
  },
  currentLoans: [],
  recentReports: [],
  notices: [],
};

interface RoleCase {
  role: "administrator" | "librarian" | "student" | "faculty";
  requested: string;
  expectedHome: string;
}

const roles: MockRole[] = [
  { type: "administrator", home: "/admin/dashboard", marker: "Dashboard" },
  { type: "super-administrator", home: "/admin/dashboard", marker: "Dashboard" },
  { type: "librarian", home: "/librarian/dashboard", marker: "Library Operations" },
  { type: "student", home: "/student/dashboard", marker: "Student Portal" },
  { type: "faculty", home: "/faculty/dashboard", marker: "Faculty Portal" },
];

const roleIsolationCases: RoleCase[] = [
  { role: "student", requested: "/admin/dashboard", expectedHome: "/student/dashboard" },
  { role: "librarian", requested: "/student/dashboard", expectedHome: "/librarian/dashboard" },
  { role: "student", requested: "/faculty/dashboard", expectedHome: "/student/dashboard" },
  { role: "faculty", requested: "/librarian/dashboard", expectedHome: "/faculty/dashboard" },
];

const setupTimeout = process.platform === "win32" ? 240_000 : 180_000;

describe("chromium full browser regression", async () => {
  // Keep one Nuxt server/browser setup for all Chromium checks. Rebuilding Nuxt in
  // three separate test files caused Windows setup hooks to hit the 120s limit.
  await setup({
    browser: true,
    browserOptions: { type: "chromium" },
    setupTimeout,
  });

  it("renders the sign-in UI", async () => {
    const page = await createPage("/");
    await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();

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

  it("has no horizontal overflow across common release viewports", async () => {
    for (const width of [360, 390, 430, 768, 1024, 1280]) {
      const page = await createPage("/");
      await page.setViewportSize({ width, height: width < 768 ? 800 : 900 });
      await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();

      const sizes = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));

      expect(sizes.documentWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(sizes.innerWidth + 1);
      await page.close();
    }
  });

  it("keeps the public registration route reachable", async () => {
    const page = await createPage("/student-registration");
    expect(new URL(page.url()).pathname).toBe("/student-registration");
    await page.close();
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

        if (url.pathname === "/api/admin-management/dashboard") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ data: adminDashboardData }),
          });
        }

        if (url.pathname === "/api/circulation/dashboard-summary") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ data: {} }),
          });
        }

        if (url.pathname === "/api/student-portal/session/start") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: {
                sessionKey: "mock-student-session",
                status: "Active",
                loginAt: new Date().toISOString(),
                lastActivityAt: new Date().toISOString(),
                resumed: false,
                device: {
                  deviceKey: "mock-device",
                  displayName: "Chromium Test Browser",
                  deviceType: "Desktop",
                  operatingSystem: "Test",
                  browser: "Chromium",
                  applicationMode: "Web Browser",
                  trusted: true,
                },
              },
            }),
          });
        }

        if (url.pathname === "/api/student-portal/dashboard") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ data: studentDashboardData }),
          });
        }

        if (url.pathname === "/api/faculty-portal/dashboard") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ data: facultyDashboardData }),
          });
        }

        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      });

      await page.getByPlaceholder("Enter email or username").fill(role.type);
      await page.getByPlaceholder("Enter password").fill("test-password");
      await page.getByRole("button", { name: "Sign In" }).click();

      await page.waitForURL((url) => url.pathname === role.home, { timeout: 15_000 });
      expect(new URL(page.url()).pathname).toBe(role.home);
      await page.getByText(role.marker, { exact: false }).first().waitFor({ timeout: 10_000 });
      await page.close();
    });
  }

  for (const testCase of roleIsolationCases) {
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
      await page.close();
    });
  }
});
