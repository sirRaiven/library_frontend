import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("SNCBT Design System v2 DS-2 shells", () => {
  it("keeps role-appropriate mobile navigation", () => {
    const student = read("app/layouts/student.vue");
    const faculty = read("app/layouts/faculty.vue");
    const admin = read("app/layouts/admin.vue");
    const librarian = read("app/layouts/librarian.vue");

    expect(student).toContain("PortalMobileBottomNav");
    expect(faculty).toContain("PortalMobileBottomNav");
    expect(admin).not.toContain("<PortalMobileBottomNav");
    expect(librarian).not.toContain("<PortalMobileBottomNav");
  });

  it("preserves mobile access to Student and Faculty secondary destinations", () => {
    const student = read("app/layouts/student.vue");
    const faculty = read("app/layouts/faculty.vue");

    for (const route of [
      "/student/history",
      "/student/library-card",
      "/student/notifications",
      "/student/security",
    ]) expect(student).toContain(route);

    expect(faculty).toContain("/faculty/profile");
  });

  it("keeps public shell accessibility markers", () => {
    expect(read("app/layouts/default.vue")).toContain("AppSkipLink");
    expect(read("app/pages/student-registration.vue")).toContain("<AppSkipLink />");
  });
});
