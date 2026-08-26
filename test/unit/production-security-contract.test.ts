import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const readProjectFile = (relativePath: string): string =>
  source(resolve(process.cwd(), relativePath));

describe("production security contract", () => {
  it("keeps production browser security headers configured", () => {
    const configSource = readProjectFile("nuxt.config.ts");

    for (const header of [
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      expect(configSource).toContain(header);
    }

    expect(configSource).toContain("wasm-unsafe-eval");
  });

  it("keeps secure production cookies and credentialed auth requests", () => {
    const authSource = readProjectFile("app/composables/useAuth.ts");

    expect(authSource).toContain("secure: import.meta.env.PROD");
    expect(authSource).toContain('credentials: "include"');
  });
});
