import { expect } from "vitest";
import type { Page } from "playwright-core";

export async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
}

export async function auditInteractiveControls(page: Page): Promise<void> {
  const unnamedButtons = await page.locator("button:visible").evaluateAll((buttons) =>
    buttons
      .filter((button) => {
        const element = button as HTMLElement;
        const name = [
          element.innerText,
          element.getAttribute("aria-label"),
          element.getAttribute("title"),
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        return !name;
      })
      .length,
  );
  expect(unnamedButtons, "visible buttons must have an accessible name").toBe(0);

  const brokenLinks = await page.locator("a:visible").evaluateAll((links) =>
    links.filter((link) => {
      const href = link.getAttribute("href") ?? "";
      return !href || href.toLowerCase().startsWith("javascript:");
    }).length,
  );
  expect(brokenLinks, "visible links must have a usable href").toBe(0);

  const focusCandidates = page.locator(
    'button:visible:not([disabled]), input:visible:not([disabled]):not([type="hidden"]), textarea:visible:not([disabled]), select:visible:not([disabled])',
  );

  const keyboardIssues = await focusCandidates.evaluateAll((controls) =>
    controls.flatMap((node, index) => {
      const element = node as HTMLElement;
      const ariaDisabled = element.getAttribute("aria-disabled") === "true";
      if (ariaDisabled) return [];

      const inInertSubtree = Boolean(element.closest("[inert]"));
      const hiddenFromAssistiveTechnology =
        element.getAttribute("aria-hidden") === "true" || Boolean(element.closest('[aria-hidden="true"]'));
      const tabIndex = element.tabIndex;

      if (!inInertSubtree && !hiddenFromAssistiveTechnology && tabIndex >= 0) return [];

      const label = [
        element.getAttribute("aria-label"),
        element.getAttribute("placeholder"),
        element.getAttribute("name"),
        element.textContent,
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);

      return [{
        index,
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute("type") ?? "",
        label,
        tabIndex,
        inInertSubtree,
        hiddenFromAssistiveTechnology,
      }];
    }),
  );

  expect(
    keyboardIssues,
    `enabled visible controls must remain keyboard-reachable; issues: ${JSON.stringify(keyboardIssues)}`,
  ).toEqual([]);
}

export async function exerciseSafeControls(page: Page): Promise<void> {
  const searchInputs = page.locator(
    'input:visible[placeholder*="search" i], input:visible[type="search"]',
  );
  const count = Math.min(await searchInputs.count(), 2);
  for (let index = 0; index < count; index += 1) {
    const input = searchInputs.nth(index);
    if (await input.isDisabled()) continue;
    await input.fill("e2e");
    await page.waitForTimeout(150);
    await input.fill("");
  }

  for (const name of ["Refresh", "Reload"] as const) {
    const button = page.getByRole("button", { name, exact: true }).first();
    if ((await button.count()) && (await button.isVisible()) && !(await button.isDisabled())) {
      await button.click();
      await page.waitForTimeout(250);
    }
  }
}
