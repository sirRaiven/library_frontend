import { chromium, firefox, webkit, type Browser, type BrowserContext, type Page } from "playwright-core";
import { expect } from "vitest";
import type { AcceptanceEnv, AcceptanceRole } from "./env";
import { requireRoleCredentials } from "./env";
import { attachRuntimeGuard, type RuntimeGuard, type RuntimeGuardOptions } from "./runtime-guard";

const HOME: Record<AcceptanceRole, string> = {
  administrator: "/admin/dashboard",
  librarian: "/librarian/dashboard",
  student: "/student/dashboard",
  faculty: "/faculty/dashboard",
};

export interface GuardedPage {
  context: BrowserContext;
  page: Page;
  guard: RuntimeGuard;
  close(): Promise<void>;
}

export interface AcceptanceHarness {
  start(): Promise<void>;
  stop(): Promise<void>;
  newPage(options?: RuntimeGuardOptions): Promise<GuardedPage>;
  goto(page: Page, path: string): Promise<void>;
  login(page: Page, role: AcceptanceRole): Promise<void>;
}

export function createAcceptanceHarness(env: AcceptanceEnv): AcceptanceHarness {
  let browser: Browser | null = null;

  async function start() {
    const launcher = env.browser === "firefox" ? firefox : env.browser === "webkit" ? webkit : chromium;
    browser = await launcher.launch({ headless: env.headless });
  }

  async function stop() {
    await browser?.close();
    browser = null;
  }

  async function newPage(options: RuntimeGuardOptions = {}): Promise<GuardedPage> {
    if (!browser) throw new Error("Acceptance browser has not been started.");
    const context = await browser.newContext({
      baseURL: env.frontendUrl,
      viewport: { width: 1440, height: 1000 },
      ignoreHTTPSErrors: false,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(env.timeoutMs);
    page.setDefaultNavigationTimeout(env.timeoutMs);
    const guard = attachRuntimeGuard(page, env, options);
    return {
      context,
      page,
      guard,
      async close() {
        guard.dispose();
        await context.close();
      },
    };
  }


  async function waitForNuxtHydration(page: Page): Promise<void> {
    await page.waitForFunction(
      () => {
        const clientWindow = window as typeof window & {
          useNuxtApp?: () => { isHydrating?: boolean };
        };

        if (typeof clientWindow.useNuxtApp !== "function") return false;

        try {
          return clientWindow.useNuxtApp().isHydrating === false;
        } catch {
          return false;
        }
      },
      undefined,
      { timeout: env.timeoutMs },
    );
  }

  async function goto(page: Page, path: string): Promise<void> {
    const target = new URL(path, `${env.frontendUrl}/`).toString();
    await page.goto(target);
    await waitForNuxtHydration(page);
  }

  async function login(page: Page, role: AcceptanceRole): Promise<void> {
    const account = requireRoleCredentials(env, role);
    await goto(page, "/");
    await page.getByPlaceholder("Enter email or username").fill(account.username);
    await page.getByPlaceholder("Enter password").fill(account.password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.waitForURL((url) => url.pathname === HOME[role], { timeout: env.timeoutMs });
    expect(new URL(page.url()).pathname).toBe(HOME[role]);
  }

  return { start, stop, newPage, goto, login };
}
