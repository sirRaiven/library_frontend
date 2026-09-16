import { describe, expect, it } from "vitest";
import { assertStrictFixtures, assertWriteSafety, getAcceptanceEnv, isLocalUrl } from "./helpers/env";

const env = getAcceptanceEnv();

describe("Phase 26 acceptance preflight", () => {
  it("can reach the Nuxt frontend", async () => {
    const response = await fetch(`${env.frontendUrl}/`, { redirect: "manual" });
    expect(response.status).toBeLessThan(500);
  });

  it("can reach the Strapi public reference-data endpoint", async () => {
    const response = await fetch(`${env.backendUrl}/api/reference-data?scope=public-registration`);
    expect(response.status).toBeLessThan(500);
  });

  it("enforces write safety and strict fixtures", () => {
    assertWriteSafety(env);
    assertStrictFixtures(env);
    if (env.target === "localhost") {
      expect(isLocalUrl(env.frontendUrl)).toBe(true);
      expect(isLocalUrl(env.backendUrl)).toBe(true);
    }
  });
});
