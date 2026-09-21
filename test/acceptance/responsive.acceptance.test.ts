import { afterAll, beforeAll, describe, it } from "vitest";
import { createAcceptanceHarness } from "./helpers/harness";
import { getAcceptanceEnv } from "./helpers/env";
import { assertNoHorizontalOverflow } from "./helpers/ui-audit";

const env = getAcceptanceEnv();
const harness = createAcceptanceHarness(env);
const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
];

describe(`Phase 33 ${env.browser} responsive acceptance`, () => {
  beforeAll(() => harness.start());
  afterAll(() => harness.stop());

  for (const viewport of viewports) {
    it(`has no horizontal overflow on sign-in at ${viewport.width}px`, async () => {
      const testPage = await harness.newPage();
      try {
        const { page, guard } = testPage;
        await page.setViewportSize(viewport);
        await harness.goto(page, "/");
        await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
        await assertNoHorizontalOverflow(page);
        await guard.assertClean();
      } finally {
        await testPage.close();
      }
    });
  }

  it.skipIf(!env.credentials.librarian)("keeps the Librarian dashboard responsive on phone width", async () => {
    const testPage = await harness.newPage();
    try {
      const { page, guard } = testPage;
      await page.setViewportSize({ width: 390, height: 844 });
      await harness.login(page, "librarian");
      await assertNoHorizontalOverflow(page);
      await guard.assertClean();
    } finally {
      await testPage.close();
    }
  });
});
