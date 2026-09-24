import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { source } from "../helpers/source-files";

const read = (relativePath: string) => source(resolve(process.cwd(), relativePath));

describe("DS-8.4 member dashboard and account experience contract", () => {
  it("uses a modern shared dashboard hierarchy for Student and Faculty", () => {
    const student = read("app/pages/student/dashboard.vue");
    const faculty = read("app/pages/faculty/dashboard.vue");

    expect(student).toContain("sncbt-member-dashboard-hero");
    expect(student).toContain("Library at a glance");
    expect(student).toContain("My books");
    expect(student).toContain("Action center");

    expect(faculty).toContain("sncbt-member-dashboard-hero");
    expect(faculty).toContain("Department Library overview");
    expect(faculty).toContain("Books currently assigned");
    expect(faculty).toContain("Action center");
  });

  it("uses My Account wording instead of implementation-oriented profile/security titles", () => {
    const studentPage = read("app/pages/student/security.vue");
    const facultyPage = read("app/pages/faculty/profile.vue");
    const studentLayout = read("app/layouts/student.vue");
    const facultyLayout = read("app/layouts/faculty.vue");
    const pageTitles = read("app/plugins/dynamic-page-title.ts");

    expect(studentPage).toContain('title: "My Account"');
    expect(studentPage).toContain('title="My Account"');
    expect(studentPage).not.toContain("Profile and Security");
    expect(studentLayout).toContain('label: "My Account"');

    expect(facultyPage).toContain('title: "My Account"');
    expect(facultyPage).toContain('title="My Account"');
    expect(facultyLayout).toContain('label: "My Account"');
    expect(facultyLayout).not.toContain('label: "Profile"');
    const studentAccountTitleLine = pageTitles.split("\n").find(line => line.includes("student") && line.includes("security"));
    const facultyAccountTitleLine = pageTitles.split("\n").find(line => line.includes("faculty") && line.includes("profile"));
    expect(studentAccountTitleLine).toContain('title: "My Account"');
    expect(facultyAccountTitleLine).toContain('title: "My Account"');
  });

  it("keeps account forms and security workflows intact", () => {
    const student = read("app/pages/student/security.vue");
    const faculty = read("app/pages/faculty/profile.vue");

    for (const token of ["saveProfile", "submitPasswordChange", "revokeSession", "revokeOthers", "toggleTrust"]) {
      expect(student).toContain(token);
    }
    expect(student).toContain("<AppFormSection");
    expect(student).toContain("<AppStickyFormActions>");

    for (const token of ["fillForm", "save", "load"]) {
      expect(faculty).toContain(token);
    }
    expect(faculty).toContain("<AppFormSection");
    expect(faculty).toContain("<AppStickyFormActions>");
  });

  it("keeps the DS-8.4 visual treatment lightweight", () => {
    const css = read("app/assets/css/main.css");
    expect(css).toContain("Design System v2 — DS-8.4");
    expect(css).toContain(".sncbt-member-dashboard-hero");
    expect(css).toContain(".sncbt-account-identity-card");
    expect(css).toContain(".sncbt-account-settings-nav");
  });
});
