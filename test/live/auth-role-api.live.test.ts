import { describe, expect, it } from "vitest";
import { roleCredential, runLiveTests, strapiUrl } from "./live-test-env";

type RoleName = "ADMIN" | "LIBRARIAN" | "STUDENT" | "FACULTY";

const cases: Array<{
  envRole: RoleName;
  expectedRole: string[];
  allowed: string;
  denied: string[];
}> = [
  {
    envRole: "ADMIN",
    expectedRole: ["administrator", "super-administrator", "admin", "system-administrator"],
    allowed: "/api/admin-management/dashboard",
    denied: ["/api/student-portal/dashboard", "/api/faculty-portal/dashboard"],
  },
  {
    envRole: "LIBRARIAN",
    expectedRole: ["librarian"],
    allowed: "/api/circulation/dashboard-summary?limit=1",
    denied: ["/api/admin-management/dashboard", "/api/student-portal/dashboard", "/api/faculty-portal/dashboard"],
  },
  {
    envRole: "STUDENT",
    expectedRole: ["student"],
    allowed: "/api/student-portal/dashboard",
    denied: ["/api/admin-management/dashboard", "/api/faculty-portal/dashboard", "/api/circulation/dashboard-summary?limit=1"],
  },
  {
    envRole: "FACULTY",
    expectedRole: ["faculty"],
    allowed: "/api/faculty-portal/dashboard",
    denied: ["/api/admin-management/dashboard", "/api/student-portal/dashboard", "/api/circulation/dashboard-summary?limit=1"],
  },
];

async function login(identifier: string, password: string) {
  const loginResponse = await fetch(`${strapiUrl}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Device-ID": `test-${crypto.randomUUID()}` },
    body: JSON.stringify({ identifier, password }),
  });
  expect(loginResponse.status, "Login must succeed for the configured test account").toBe(200);
  const loginData = await loginResponse.json() as { jwt: string };
  expect(loginData.jwt).toBeTruthy();
  return loginData.jwt;
}

async function authenticatedGet(path: string, jwt: string) {
  return fetch(`${strapiUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      "X-Device-ID": `test-${crypto.randomUUID()}`,
    },
  });
}

const describeLive = runLiveTests ? describe : describe.skip;

describeLive("live Strapi authentication and role isolation", () => {
  for (const testCase of cases) {
    const credential = roleCredential(testCase.envRole);
    const itRole = credential ? it : it.skip;

    itRole(`${testCase.envRole} account has the correct role and policy boundaries`, async () => {
      const jwt = await login(credential!.identifier, credential!.password);
      const me = await authenticatedGet("/api/users/me?populate=role", jwt);
      expect(me.status).toBe(200);
      const user = await me.json() as { role?: { type?: string; name?: string } };
      const normalized = String(user.role?.type || user.role?.name || "").toLowerCase().replace(/\s+/g, "-");
      expect(testCase.expectedRole).toContain(normalized);

      const allowed = await authenticatedGet(testCase.allowed, jwt);
      expect(allowed.status, `${testCase.allowed} should be allowed`).toBe(200);

      for (const path of testCase.denied) {
        const denied = await authenticatedGet(path, jwt);
        expect([401, 403], `${path} must be denied to ${testCase.envRole}`).toContain(denied.status);
      }
    });
  }
});
