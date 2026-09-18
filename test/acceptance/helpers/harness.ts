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


const roleCookieCache = new Map<AcceptanceRole, Awaited<ReturnType<BrowserContext["cookies"]>>>();
const pageRoleCache = new WeakMap<Page, AcceptanceRole>();

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
    if (env.browserWsEndpoint) {
      browser = await launcher.connect(env.browserWsEndpoint, {
        exposeNetwork: env.browserExposeNetwork || "<loopback>",
        timeout: env.timeoutMs,
      });
      return;
    }

    const launchOptions = env.browser === "webkit" && env.webkitChannel === "webkit-wsl"
      ? { headless: env.headless, channel: "webkit-wsl" }
      : { headless: env.headless };
    browser = await launcher.launch(launchOptions);
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

  async function syncRoleCookieCache(page: Page): Promise<void> {
    const role = pageRoleCache.get(page);
    if (!role) return;

    const cookies = await page.context().cookies();
    const hasSessionHint = cookies.some(
      (cookie) => cookie.name === "auth-session-hint" && Boolean(cookie.value),
    );

    // A protected hard navigation can rotate the refresh cookie. Persist the
    // latest cookie set only while the client still considers the session
    // authenticated. This prevents the deliberate expired-session test from
    // poisoning the shared role cache.
    if (hasSessionHint) {
      roleCookieCache.set(role, cookies);
    }
  }

  async function goto(page: Page, path: string): Promise<void> {
    const target = new URL(path, `${env.frontendUrl}/`).toString();
    await page.goto(target);
    await waitForNuxtHydration(page);
    await syncRoleCookieCache(page);
  }

  async function login(page: Page, role: AcceptanceRole): Promise<void> {
    const cachedCookies = roleCookieCache.get(role);

    if (cachedCookies?.length) {
      pageRoleCache.set(page, role);
      await page.context().addCookies(cachedCookies);
      await goto(page, HOME[role]);

      if (new URL(page.url()).pathname === HOME[role]) {
        await syncRoleCookieCache(page);
        return;
      }

      // The cached refresh cookie may have been rotated by a previous hard
      // navigation. Fall back to one fresh credential login instead of waiting
      // for the dashboard URL until the test timeout expires.
      roleCookieCache.delete(role);
      pageRoleCache.delete(page);
    }

    const account = requireRoleCredentials(env, role);
    await goto(page, "/");
    await page.getByPlaceholder("Enter email or username").fill(account.username);
    await page.getByPlaceholder("Enter password").fill(account.password);
    const authResponsePromise = page.waitForResponse((response) =>
      /\/api\/auth\/local(?:\?|$)/.test(response.url()) && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    const authResponse = await authResponsePromise;
    if (authResponse.status() >= 400) {
      let detail = "";
      try {
        const body = await authResponse.json() as { error?: { message?: string }; message?: string };
        detail = String(body?.error?.message ?? body?.message ?? "").trim();
      } catch {
        // The HTTP status is still enough to make the acceptance failure actionable.
      }
      const throttleHint = authResponse.status() === 429
        ? " The suite reuses role sessions, so a 429 here usually means the backend was already rate-limited before this run. Restart the local backend or wait for the configured auth-rate-limit window to reset."
        : "";
      throw new Error(`${role} sign-in failed during acceptance (HTTP ${authResponse.status()})${detail ? `: ${detail}` : ""}.${throttleHint}`);
    }
    await page.waitForURL((url) => url.pathname === HOME[role], { timeout: env.timeoutMs });
    expect(new URL(page.url()).pathname).toBe(HOME[role]);
    pageRoleCache.set(page, role);
    await syncRoleCookieCache(page);
  }

  return { start, stop, newPage, goto, login };
}
