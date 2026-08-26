import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("product design and human-friendly messaging contract", () => {
  it("uses a dedicated safe sign-in message", () => {
    const page = read("app/pages/index.vue");
    const errors = read("app/utils/user-facing-error.ts");

    expect(page).toContain("signInErrorMessage(error)");
    expect(page).toContain("Check your sign-in details");
    expect(errors).toContain("The username/email or password is incorrect.");
    expect(page).not.toContain("HTTP 401");
    expect(page).not.toContain("Strapi");
  });

  it("routes public registration errors through the shared safe translator", () => {
    const registration = read("app/composables/useStudentSelfRegistration.ts");
    expect(registration).toContain("registrationErrorMessage(error)");
    expect(registration).not.toContain("candidate.response?._data?.error?.message");
  });

  it("uses the shared page shell and role-specific page headers", () => {
    const css = read("app/assets/css/main.css");
    expect(css).toContain(".sncbt-page-shell");
    expect(read("app/pages/admin/dashboard.vue")).toContain("sncbt-page-shell");
    expect(read("app/pages/student/dashboard.vue")).toContain("sncbt-page-shell");
    expect(read("app/pages/faculty/books/index.vue")).toContain("<FacultyPageHeader");
    expect(existsSync(resolve(root, "app/components/librarian/LibrarianPageHeader.vue"))).toBe(true);
  });

  it("uses clearer portal navigation wording", () => {
    const librarian = read("app/layouts/librarian.vue");
    const faculty = read("app/layouts/faculty.vue");

    expect(librarian).toContain('title: "Membership & Cards"');
    expect(librarian).toContain('title: "Library Visits"');
    expect(librarian).toContain('title: "History"');
    expect(librarian).not.toContain('title: "Academic Term & Validity"');
    expect(faculty).toContain('label: "Borrowed Books"');
    expect(faculty).toContain('label: "Profile"');
  });

  it("keeps technical details secondary in the audit record view", () => {
    const audit = read("app/pages/admin/audit-logs.vue");
    expect(audit).toContain("Advanced technical details");
    expect(audit).toContain("<details");
  });

  it("keeps user-facing system pages free of implementation commands and framework names", () => {
    const system = read("app/pages/admin/system-health.vue");
    const security = read("app/pages/student/security.vue");

    expect(system).not.toContain("npm run backup:library");
    expect(system).not.toContain("Backend API");
    expect(system).not.toContain("PostgreSQL");
    expect(system).not.toContain("GET/read");
    expect(security).not.toContain("Strapi authentication mode");
  });

  it("keeps public password toggles accessible", () => {
    const registration = read("app/pages/student-registration.vue");
    expect(registration).toContain("Hide password");
    expect(registration).toContain("Show password");
    expect(registration).toContain("Hide password confirmation");
  });
});
