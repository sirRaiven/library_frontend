import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const signIn = source(join(process.cwd(), "app/pages/index.vue"));
const css = source(join(process.cwd(), "app/assets/css/main.css"));
const nuxtConfig = source(join(process.cwd(), "nuxt.config.ts"));

const preservedSignInWrapper =
  "min-h-screen flex flex-col justify-center items-center bg-[#f4fbf8] dark:bg-neutral-950 p-4 transition-colors relative overflow-hidden";

describe("UI regression contract", () => {
  it("preserves the approved centered sign-in canvas", () => {
    expect(signIn).toContain(preservedSignInWrapper);
  });

  it("keeps accessible sign-in labels and password visibility control", () => {
    expect(signIn).toContain('label="Email or Username"');
    expect(signIn).toContain('label="Password"');
    expect(signIn).toContain('aria-label="showPassword ? \'Hide password\' : \'Show password\'"');
  });

  it("keeps light/dark color-scheme support", () => {
    expect(css).toContain("color-scheme: light");
    expect(css).toContain("color-scheme: dark");
    expect(css).toContain("min-height: 100dvh");
  });

  it("keeps mobile camera permission limited to self", () => {
    expect(nuxtConfig).toContain('"Permissions-Policy": "camera=(self), microphone=(), geolocation=()"');
  });
});
