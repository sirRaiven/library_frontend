import { useRuntimeConfig } from "#imports";
import { describe, expect, it } from "vitest";

describe("Nuxt runtime smoke test", () => {
  it("boots the Nuxt test environment and exposes the Strapi runtime config", () => {
    const config = useRuntimeConfig();

    expect(config.public).toBeTruthy();
    expect(typeof config.public.strapiUrl).toBe("string");
  });
});
