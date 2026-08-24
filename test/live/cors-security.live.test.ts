import { describe, expect, it } from "vitest";
import { frontendOrigin, runLiveTests, strapiUrl, testEnv } from "./live-test-env";

const describeLive = runLiveTests ? describe : describe.skip;

describeLive("live CORS and HTTP security", () => {
  it("accepts the configured frontend credentialed preflight", async () => {
    const response = await fetch(`${strapiUrl}/api/auth/local`, {
      method: "OPTIONS",
      headers: {
        Origin: frontendOrigin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,x-device-id",
      },
    });

    expect([200, 204]).toContain(response.status);
    expect(response.headers.get("access-control-allow-origin")).toBe(frontendOrigin);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("rejects an unknown Origin", async () => {
    const response = await fetch(`${strapiUrl}/api/auth/local`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://invalid-origin.example",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("checks frontend security headers when TEST_FRONTEND_URL is configured", async () => {
    const frontendUrl = String(testEnv.TEST_FRONTEND_URL ?? "").trim();
    if (!frontendUrl) return;

    const response = await fetch(frontendUrl, { redirect: "manual" });
    expect(response.headers.get("content-security-policy")).toBeTruthy();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("referrer-policy")).toBeTruthy();
    expect(response.headers.get("permissions-policy")).toContain("camera=(self)");

    if (frontendUrl.startsWith("https://")) {
      expect(response.headers.get("strict-transport-security")).toBeTruthy();
    }
  });
});
