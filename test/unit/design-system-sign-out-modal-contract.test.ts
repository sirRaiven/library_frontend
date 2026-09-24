import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) =>
  readFileSync(resolve(process.cwd(), file), "utf8");

const modal = read("app/components/shared/AppSignOutModal.vue");

const layouts = {
  admin: read("app/layouts/admin.vue"),
  librarian: read("app/layouts/librarian.vue"),
  student: read("app/layouts/student.vue"),
  faculty: read("app/layouts/faculty.vue"),
};

describe("DS-8.3 reusable sign-out modal contract", () => {
  it("uses the shared SNCBT themed modal with restrained circular decoration", () => {
    expect(modal).toContain('title: "Sign out of SNCBT Library?"');
    expect(modal).toContain("Session security");
    expect(modal).toContain("sncbt-signout-modal__orb--large");
    expect(modal).toContain("sncbt-signout-modal__orb--small");
    expect(modal).toContain("var(--sncbt-theme-surface-start)");
    expect(modal).toContain("var(--sncbt-theme-orb)");
    expect(modal).not.toMatch(/filter\s*:\s*blur\(|backdrop-filter\s*:/);
  });

  it("makes staying signed in the initial safe action while keeping Sign Out explicit", () => {
    expect(modal).toContain('cancelLabel: "Stay Signed In"');
    expect(modal).toContain('confirmLabel: "Sign Out"');
    expect(modal).toContain("autofocus");
    expect(modal).toContain('color="error"');
    expect(modal).toContain('aria-label="Close sign out confirmation"');
    expect(modal).toContain('emit("confirm")');
  });

  it("is reused by all four authenticated portal layouts", () => {
    for (const source of Object.values(layouts)) {
      expect(source).toContain(
        'import AppSignOutModal from "~/components/shared/AppSignOutModal.vue";',
      );
      expect(source).toContain("<AppSignOutModal");
      expect(source).toContain(':account-name="userName"');
    }
  });

  it("preserves each portal logout handler", () => {
    expect(layouts.admin).toContain("async function signOut()");
    expect(layouts.admin).toContain("await monitoring.end()");
    expect(layouts.admin).toContain("await auth.logout()");

    expect(layouts.librarian).toContain("async function handleLogout()");
    expect(layouts.librarian).toContain("await monitoring.end()");
    expect(layouts.librarian).toContain("await auth.logout()");

    expect(layouts.student).toContain("async function signOut()");
    expect(layouts.student).toContain("await monitoring.end()");
    expect(layouts.student).toContain("await auth.logout()");

    expect(layouts.faculty).toContain("async function signOut()");
    expect(layouts.faculty).toContain("await monitoring.end()");
    expect(layouts.faculty).toContain("await auth.logout()");
  });
});
