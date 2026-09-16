import type { AcceptanceEnv, AcceptanceRole } from "./env";

export interface AcceptanceRoute {
  source: string;
  label: string;
  role: AcceptanceRole;
  resolve(env: AcceptanceEnv): string | null;
}

const staticRoute = (role: AcceptanceRole, path: string, label: string): AcceptanceRoute => ({
  role,
  source: path,
  label,
  resolve: () => path,
});

const dynamicRoute = (
  role: AcceptanceRole,
  source: string,
  label: string,
  resolve: (env: AcceptanceEnv) => string | null,
): AcceptanceRoute => ({ role, source, label, resolve });

export const adminRoutes: AcceptanceRoute[] = [
  staticRoute("administrator", "/admin", "Admin entry"),
  staticRoute("administrator", "/admin/accounts-review", "Accounts review"),
  staticRoute("administrator", "/admin/activity", "Activity"),
  staticRoute("administrator", "/admin/audit-logs", "Audit logs"),
  staticRoute("administrator", "/admin/dashboard", "Admin dashboard"),
  staticRoute("administrator", "/admin/devices", "Devices"),
  staticRoute("administrator", "/admin/librarians", "Librarians"),
  staticRoute("administrator", "/admin/librarians/create", "Create librarian"),
  staticRoute("administrator", "/admin/monitoring-reports", "Monitoring reports"),
  staticRoute("administrator", "/admin/operations", "Operations"),
  staticRoute("administrator", "/admin/reports", "Admin reports"),
  staticRoute("administrator", "/admin/roles", "Roles"),
  dynamicRoute("administrator", "/admin/roles/[id]", "Role detail", (env) =>
    env.fixtures.adminRoleId ? `/admin/roles/${env.fixtures.adminRoleId}` : null,
  ),
  staticRoute("administrator", "/admin/sessions", "Sessions"),
  staticRoute("administrator", "/admin/settings", "Settings"),
  staticRoute("administrator", "/admin/system-health", "System health"),
  staticRoute("administrator", "/admin/users", "Users"),
  dynamicRoute("administrator", "/admin/users/[id]", "User detail", (env) =>
    env.fixtures.adminUserId ? `/admin/users/${env.fixtures.adminUserId}` : null,
  ),
  dynamicRoute("administrator", "/admin/users/[id]/activity", "User activity", (env) =>
    env.fixtures.adminUserId ? `/admin/users/${env.fixtures.adminUserId}/activity` : null,
  ),
  dynamicRoute("administrator", "/admin/users/[id]/devices", "User devices", (env) =>
    env.fixtures.adminUserId ? `/admin/users/${env.fixtures.adminUserId}/devices` : null,
  ),
  dynamicRoute("administrator", "/admin/users/[id]/sessions", "User sessions", (env) =>
    env.fixtures.adminUserId ? `/admin/users/${env.fixtures.adminUserId}/sessions` : null,
  ),
];

export const librarianRoutes: AcceptanceRoute[] = [
  staticRoute("librarian", "/librarian/dashboard", "Librarian dashboard"),
  staticRoute("librarian", "/librarian/books", "Books"),
  dynamicRoute("librarian", "/librarian/books/[id]", "Book record", (env) =>
    env.fixtures.bookId ? `/librarian/books/${env.fixtures.bookId}` : null,
  ),
  dynamicRoute("librarian", "/librarian/books/[id]/edit", "Edit book", (env) =>
    env.fixtures.bookId ? `/librarian/books/${env.fixtures.bookId}/edit` : null,
  ),
  staticRoute("librarian", "/librarian/books/copies", "Book copies"),
  staticRoute("librarian", "/librarian/books/import", "Book import"),
  staticRoute("librarian", "/librarian/books/print", "Book print"),
  staticRoute("librarian", "/librarian/books/register", "Register book"),
  staticRoute("librarian", "/librarian/borrow", "Borrow"),
  staticRoute("librarian", "/librarian/faculty-book-reports", "Faculty book reports"),
  staticRoute("librarian", "/librarian/faculty", "Faculty"),
  staticRoute("librarian", "/librarian/fines", "Fines"),
  staticRoute("librarian", "/librarian/history", "History"),
  staticRoute("librarian", "/librarian/library-card-designer", "Library card designer"),
  staticRoute("librarian", "/librarian/library-card-print", "Library card print"),
  staticRoute("librarian", "/librarian/membership-term", "Membership term"),
  staticRoute("librarian", "/librarian/memberships", "Memberships"),
  staticRoute("librarian", "/librarian/notifications", "Notifications"),
  staticRoute("librarian", "/librarian/reports", "Reports"),
  staticRoute("librarian", "/librarian/reservations", "Reservations"),
  staticRoute("librarian", "/librarian/return", "Return"),
  staticRoute("librarian", "/librarian/student-registration-approvals", "Registration approvals"),
  staticRoute("librarian", "/librarian/student-self-registration", "Student self registration"),
  staticRoute("librarian", "/librarian/students", "Students"),
  staticRoute("librarian", "/librarian/visits", "Visits"),
];

export const studentRoutes: AcceptanceRoute[] = [
  staticRoute("student", "/student", "Student entry"),
  staticRoute("student", "/student/books", "Student books"),
  dynamicRoute("student", "/student/books/[documentId]", "Student book detail", (env) =>
    env.fixtures.bookDocumentId ? `/student/books/${env.fixtures.bookDocumentId}` : null,
  ),
  staticRoute("student", "/student/borrowings", "Student borrowings"),
  staticRoute("student", "/student/dashboard", "Student dashboard"),
  staticRoute("student", "/student/history", "Student history"),
  staticRoute("student", "/student/library-card", "Student library card"),
  staticRoute("student", "/student/notifications", "Student notifications"),
  staticRoute("student", "/student/reservations", "Student reservations"),
  staticRoute("student", "/student/security", "Student security"),
];

export const facultyRoutes: AcceptanceRoute[] = [
  staticRoute("faculty", "/faculty", "Faculty entry"),
  staticRoute("faculty", "/faculty/books", "Faculty books"),
  dynamicRoute("faculty", "/faculty/books/[documentId]", "Faculty book detail", (env) =>
    env.fixtures.bookDocumentId ? `/faculty/books/${env.fixtures.bookDocumentId}` : null,
  ),
  staticRoute("faculty", "/faculty/borrowings", "Faculty borrowings"),
  staticRoute("faculty", "/faculty/dashboard", "Faculty dashboard"),
  staticRoute("faculty", "/faculty/profile", "Faculty profile"),
  staticRoute("faculty", "/faculty/reports", "Faculty reports"),
];

export const protectedRoutes = [...adminRoutes, ...librarianRoutes, ...studentRoutes, ...facultyRoutes];
export const publicRoutes = ["/", "/student-registration"] as const;
export const compatibilityRoutes = ["/faculty-access"] as const;

export function routesForRole(role: AcceptanceRole): AcceptanceRoute[] {
  return protectedRoutes.filter((route) => route.role === role);
}
