import type { Page, Response } from "playwright-core";
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
  assertClean(): void;
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
  const backendOrigin = new URL(env.backendUrl).origin;
  const frontendOrigin = new URL(env.frontendUrl).origin;

  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() !== "error") return;
    if ((options.allowedConsoleErrors ?? []).some((pattern) => pattern.test(message.text()))) return;
    issues.push({ kind: "console", message: message.text() });
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
    const origin = new URL(url).origin;
    if (origin === backendOrigin || (origin === frontendOrigin && response.status() >= 500)) {
      issues.push({ kind: "response", message: `${response.status()} ${url}` });
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  return {
    issues,
    assertClean() {
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
