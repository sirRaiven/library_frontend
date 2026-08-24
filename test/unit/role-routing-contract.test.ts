import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const globalMiddleware = source(join(process.cwd(), "app/middleware/auth.global.ts"));
const authPlugin = source(join(process.cwd(), "app/plugins/auth.client.ts"));
const authComposable = source(join(process.cwd(), "app/composables/useAuth.ts"));

const routePolicies = [
  { prefix: "/admin", roleMarker: "isAdministrator" },
  { prefix: "/librarian", roleMarker: 'role !== "librarian"' },
  { prefix: "/student/", roleMarker: 'role !== "student"' },
  { prefix: "/faculty", roleMarker: 'role !== "faculty"' },
] as const;

const mountedGuardPolicies = [
  { prefix: "/admin", roleMarker: "isAdministrator" },
  { prefix: "/librarian", roleMarker: "isLibrarian" },
  { prefix: "/student/", roleMarker: "isStudent" },
  { prefix: "/faculty", roleMarker: "isFaculty" },
] as const;

const homeRoutes = [
  "/admin/dashboard",
  "/librarian/dashboard",
  "/student/dashboard",
  "/faculty/dashboard",
] as const;

describe("role and routing source contract", () => {
  it.each(routePolicies)("protects $prefix in the global middleware", ({ prefix, roleMarker }) => {
    expect(globalMiddleware).toContain(`startsWith(\"${prefix}\")`);
    expect(globalMiddleware).toContain(roleMarker);
  });

  it.each(mountedGuardPolicies)(
    "re-checks $prefix after hard-load session restoration",
    ({ prefix, roleMarker }) => {
      expect(authPlugin).toContain(`startsWith(\"${prefix}\")`);
      expect(authPlugin).toContain(roleMarker);
    },
  );

  it.each(homeRoutes)("keeps role home route %s", (route) => {
    expect(authComposable).toContain(`return \"${route}\"`);
  });

  it("keeps only the intended public routes", () => {
    expect(globalMiddleware).toContain('to.path === "/"');
    expect(globalMiddleware).toContain('to.path === "/student-registration"');
    expect(authPlugin).toContain('currentRoute.path === "/"');
    expect(authPlugin).toContain('currentRoute.path === "/student-registration"');
  });

  it("keeps the mounted auth plugin as a hard-load authentication guard", () => {
    expect(authPlugin).toContain('hook("app:mounted"');
    expect(authPlugin).toContain("!auth.isAuthenticated.value");
    expect(authPlugin).toContain('path: "/"');
    expect(authPlugin).toContain("!canAccessPortalPath(path)");
  });
});
