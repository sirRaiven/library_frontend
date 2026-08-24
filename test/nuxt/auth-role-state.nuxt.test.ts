import { describe, expect, it } from "vitest";
import { useAuth } from "../../app/composables/useAuth";

const baseUser = {
  id: 99,
  username: "test-user",
  email: "test@example.invalid",
  confirmed: true,
  blocked: false,
  provider: "local",
};

function setRole(type: string, name = type) {
  const auth = useAuth();
  auth.clearSession();
  auth.accessToken.value = "test-token";
  auth.user.value = {
    ...baseUser,
    role: { id: 1, type, name },
  };
  auth.initialized.value = true;
  return auth;
}

describe("Nuxt auth role state", () => {
  it.each([
    ["administrator", "/admin/dashboard"],
    ["super-administrator", "/admin/dashboard"],
    ["librarian", "/librarian/dashboard"],
    ["student", "/student/dashboard"],
    ["faculty", "/faculty/dashboard"],
  ] as const)("maps %s to %s", (role, home) => {
    const auth = setRole(role);
    expect(auth.role.value).toBe(role);
    expect(auth.homeRoute.value).toBe(home);
    expect(auth.isAuthenticated.value).toBe(true);
  });

  it("normalizes common administrator role names", () => {
    const auth = setRole("system-administrator", "System Administrator");
    expect(auth.role.value).toBe("administrator");
    expect(auth.isAdministrator.value).toBe(true);
  });

  it("does not authenticate unsupported roles", () => {
    const auth = setRole("editor", "Editor");
    expect(auth.role.value).toBeNull();
    expect(auth.isAuthenticated.value).toBe(false);
  });

  it("clears session state without erasing the privacy-safe device id", () => {
    const auth = setRole("student");
    auth.deviceIdentifier.value = "test-device-id";
    auth.clearSession();

    expect(auth.accessToken.value).toBeNull();
    expect(auth.user.value).toBeNull();
    expect(auth.deviceIdentifier.value).toBe("test-device-id");
  });
});
