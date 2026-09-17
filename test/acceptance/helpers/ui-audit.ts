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
    buttons.flatMap((button, index) => {
      const element = button as HTMLElement;
      const labelledBy = (element.getAttribute("aria-labelledby") ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ");
      const descendantLabels = Array.from(
        element.querySelectorAll<HTMLElement>("[aria-label], img[alt]"),
      )
        .map((child) => child.getAttribute("aria-label") ?? child.getAttribute("alt") ?? "")
        .join(" ");
      const name = [
        element.innerText,
        element.getAttribute("aria-label"),
        labelledBy,
        element.getAttribute("title"),
        descendantLabels,
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (name) return [];

      return [{
        index,
        ariaLabel: element.getAttribute("aria-label") ?? "",
        ariaLabelledBy: element.getAttribute("aria-labelledby") ?? "",
        title: element.getAttribute("title") ?? "",
        dataSlot: element.getAttribute("data-slot") ?? "",
        className: element.className,
        outerHTML: element.outerHTML.slice(0, 500),
      }];
    }),
  );
  expect(
    unnamedButtons,
    `visible buttons must have an accessible name; issues: ${JSON.stringify(unnamedButtons)}`,
  ).toEqual([]);

  const brokenLinks = await page.locator("a:visible").evaluateAll((links) =>
    links.filter((link) => {
      const href = link.getAttribute("href") ?? "";
      return !href || href.toLowerCase().startsWith("javascript:");
    }).length,
  );
  expect(brokenLinks, "visible links must have a usable href").toBe(0);

  const visibilityCandidates = page.locator(
    'button:visible:not([disabled]), input:visible:not([disabled]):not([type="hidden"]), textarea:visible:not([disabled]), select:visible:not([disabled])',
  );

  const hiddenKeyboardLeaks = await visibilityCandidates.evaluateAll((controls) =>
    controls.flatMap((node, index) => {
      const element = node as HTMLElement;
      const inInertSubtree = Boolean(element.closest("[inert]"));
      const hiddenFromAssistiveTechnology =
        element.getAttribute("aria-hidden") === "true" || Boolean(element.closest('[aria-hidden="true"]'));

      // Component libraries intentionally render internal native controls and
      // spinner buttons with tabindex=-1. They are implementation details, not
      // independent page-level tab stops. The generic sweep therefore checks
      // the inverse accessibility invariant: controls hidden from users/AT must
      // not remain keyboard-reachable. Specific workflows test their exposed
      // composite controls directly.
      if (!(inInertSubtree || hiddenFromAssistiveTechnology) || element.tabIndex < 0) return [];

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
        tabIndex: element.tabIndex,
        inInertSubtree,
        hiddenFromAssistiveTechnology,
      }];
    }),
  );

  expect(
    hiddenKeyboardLeaks,
    `hidden controls must not be keyboard reachable; issues: ${JSON.stringify(hiddenKeyboardLeaks)}`,
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
