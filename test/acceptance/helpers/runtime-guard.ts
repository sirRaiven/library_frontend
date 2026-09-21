import type { ConsoleMessage, Page, Response } from "playwright-core";
import type { AcceptanceEnv } from "./env";

export interface AllowedHttpFailure {
  pattern: RegExp;
  statuses: number[];
}

export interface RuntimeGuardOptions {
  allowedHttpFailures?: AllowedHttpFailure[];
  allowedConsoleErrors?: RegExp[];
}

export interface RuntimeIssue {
  kind: "console" | "pageerror" | "requestfailed" | "response";
  message: string;
}

export interface RuntimeGuard {
  issues: RuntimeIssue[];
  assertClean(): Promise<void>;
  dispose(): void;
}

function responseAllowed(response: Response, options: RuntimeGuardOptions): boolean {
  const url = response.url();
  const status = response.status();
  return (options.allowedHttpFailures ?? []).some(
    (rule) => rule.pattern.test(url) && rule.statuses.includes(status),
  );
}

export function attachRuntimeGuard(
  page: Page,
  env: AcceptanceEnv,
  options: RuntimeGuardOptions = {},
): RuntimeGuard {
  const issues: RuntimeIssue[] = [];
  const pendingConsoleDiagnostics = new Set<Promise<void>>();
  const backendOrigin = new URL(env.backendUrl).origin;
  const frontendOrigin = new URL(env.frontendUrl).origin;

  async function renderConsoleMessage(message: ConsoleMessage): Promise<string> {
    const renderedArgs: string[] = [];

    for (const argument of message.args()) {
      try {
        const value = await argument.jsonValue();
        if (typeof value === "string") {
          renderedArgs.push(value);
          continue;
        }

        if (value instanceof Error) {
          renderedArgs.push(value.stack || value.message);
          continue;
        }

        if (value !== undefined) {
          const json = JSON.stringify(value);
          renderedArgs.push(json ?? String(value));
          continue;
        }
      } catch {
        // Firefox can expose console objects that are not serializable. Fall
        // back to Playwright's handle preview instead of losing the location.
      }

      renderedArgs.push(argument.toString());
    }

    const text = renderedArgs.filter(Boolean).join(" ").trim() || message.text();
    const location = message.location();
    const locationText = location.url
      ? ` (${location.url}${location.lineNumber ? `:${location.lineNumber}` : ""}${location.columnNumber ? `:${location.columnNumber}` : ""})`
      : "";

    return `${text}${locationText}`;
  }

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() !== "error") return;

    const diagnostic = (async () => {
      const rendered = await renderConsoleMessage(message);
      const candidates = [message.text(), rendered];
      if (
        (options.allowedConsoleErrors ?? []).some((pattern) =>
          candidates.some((candidate) => pattern.test(candidate)),
        )
      ) {
        return;
      }

      issues.push({ kind: "console", message: rendered });
    })().catch((error) => {
      const detail = error instanceof Error ? error.message : String(error);
      issues.push({
        kind: "console",
        message: `${message.text()} (console diagnostic failed: ${detail})`,
      });
    });

    pendingConsoleDiagnostics.add(diagnostic);
    void diagnostic.finally(() => pendingConsoleDiagnostics.delete(diagnostic));
  };

  const onPageError = (error: Error) => {
    issues.push({ kind: "pageerror", message: error.stack || error.message });
  };

  const onRequestFailed = (request: { url(): string; failure(): { errorText: string } | null }) => {
    const failure = request.failure()?.errorText ?? "request failed";
    if (/ERR_ABORTED|NS_BINDING_ABORTED/i.test(failure)) return;
    issues.push({ kind: "requestfailed", message: `${request.url()} — ${failure}` });
  };

  const onResponse = (response: Response) => {
    if (response.status() < 400) return;
    if (responseAllowed(response, options)) return;

    const url = response.url();
    const parsedUrl = new URL(url);
    const origin = parsedUrl.origin;
    const isNuxtAsset =
      origin === frontendOrigin &&
      parsedUrl.pathname.startsWith("/_nuxt/");

    // A missing/blocked Nuxt chunk can otherwise surface in Firefox only as
    // "error loading dynamically imported module". Record any failed Nuxt
    // asset response directly so the next failure includes the HTTP status and
    // exact asset URL instead of an ambiguous console message.
    if (
      origin === backendOrigin ||
      (origin === frontendOrigin &&
        (response.status() >= 500 || isNuxtAsset))
    ) {
      issues.push({
        kind: "response",
        message: `${response.status()} ${url}`,
      });
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  return {
    issues,
    async assertClean() {
      while (pendingConsoleDiagnostics.size > 0) {
        await Promise.allSettled([...pendingConsoleDiagnostics]);
      }

      if (!issues.length) return;
      const rendered = issues.map((issue) => `- [${issue.kind}] ${issue.message}`).join("\n");
      throw new Error(`Unexpected browser/runtime issues:\n${rendered}`);
    },
    dispose() {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
      page.off("response", onResponse);
    },
  };
}
