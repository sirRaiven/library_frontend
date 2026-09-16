import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAcceptanceHarness } from "./helpers/harness";
import { getAcceptanceEnv, type AcceptanceRole } from "./helpers/env";
import { routesForRole } from "./helpers/routes";
import { auditInteractiveControls, exerciseSafeControls } from "./helpers/ui-audit";

const env = getAcceptanceEnv();
const harness = createAcceptanceHarness(env);
const roles: AcceptanceRole[] = ["administrator", "librarian", "student", "faculty"];
const entryRedirects: Record<string, string> = {
  "/admin": "/admin/dashboard",
  "/student": "/student/dashboard",
  "/faculty": "/faculty/dashboard",
};

describe("Phases 28-31 protected route and safe-control sweep", () => {
  beforeAll(() => harness.start());
  afterAll(() => harness.stop());

  for (const role of roles) {
    it.skipIf(!env.credentials[role])(`${role} can load every configured portal route without runtime errors`, async () => {
      const testPage = await harness.newPage();
      try {
        const { page, guard } = testPage;
        await harness.login(page, role);

        for (const route of routesForRole(role)) {
          const path = route.resolve(env);
          if (!path) {
            if (env.strict) throw new Error(`Strict route coverage is missing fixture data for ${route.source}`);
            continue;
          }
          await harness.goto(page, path);
          await page.waitForTimeout(300);
          const expected = entryRedirects[route.source] ?? path;
          expect(new URL(page.url()).pathname, route.label).toBe(expected);
          await auditInteractiveControls(page);
          await exerciseSafeControls(page);
        }

        guard.assertClean();
      } finally {
        await testPage.close();
      }
    });
  }
});
