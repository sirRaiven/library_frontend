import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const authSource = source(join(process.cwd(), "app/composables/useAuth.ts"));

const requiredRoles = [
  "super-administrator",
  "administrator",
  "librarian",
  "student",
  "faculty",
] as const;

const requiredEndpoints = [
  "/api/auth/local",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/users/me",
] as const;

describe("authentication source contract", () => {
  it.each(requiredEndpoints)("keeps required auth endpoint %s", (endpoint) => {
    expect(authSource).toContain(endpoint);
  });

  it.each(requiredRoles)("keeps supported application role %s", (role) => {
    expect(authSource).toContain(`\"${role}\"`);
  });

  it("keeps credentialed cookie support for login/refresh/logout", () => {
    expect(authSource.match(/credentials:\s*[\"']include[\"']/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it("keeps Bearer authorization and device identity headers", () => {
    expect(authSource).toContain('headers.set("Authorization", `Bearer ${token}`)');
    expect(authSource).toContain('headers.set("X-Device-ID"');
  });

  it("keeps refresh-on-401 and blocked-device handling", () => {
    expect(authSource).toContain("getHttpStatus(error) !== 401");
    expect(authSource).toContain("DEVICE_BLOCKED_STATUS = 423");
    expect(authSource).toContain('code === "DEVICE_BLOCKED"');
  });

  it("does not persist access tokens in localStorage/sessionStorage", () => {
    expect(authSource).not.toMatch(/localStorage\s*\.\s*setItem/i);
    expect(authSource).not.toMatch(/sessionStorage\s*\.\s*setItem/i);
  });
});
