import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const componentPath = "app/components/shared/AppSignOutModal.vue";
const component = read(componentPath);

const componentRequired = [
  'defineModel<boolean>("open"',
  'title: "Sign out of SNCBT Library?"',
  'cancelLabel: "Stay Signed In"',
  'confirmLabel: "Sign Out"',
  'Session security',
  'sncbt-signout-modal__orb--large',
  'sncbt-signout-modal__orb--small',
  'aria-label="Close sign out confirmation"',
  'autofocus',
  'color="error"',
  'emit("confirm")',
  'You can sign in again at any time.',
];

const componentMissing = componentRequired.filter((token) => !component.includes(token));
if (componentMissing.length) {
  console.error("DS-8.3 Sign Out Modal verification failed. Shared modal is missing required UX/theme tokens:");
  for (const token of componentMissing) console.error(` - ${token}`);
  process.exit(1);
}

if (/filter\s*:\s*blur\(|backdrop-filter\s*:/.test(component)) {
  console.error("DS-8.3 Sign Out Modal verification failed. Expensive blur effects are not allowed in the reusable modal.");
  process.exit(1);
}

const layouts = [
  {
    file: "app/layouts/admin.vue",
    model: 'v-model:open="logoutOpen"',
    loading: ':loading="loggingOut"',
    handler: '@confirm="signOut"',
    account: ':account-name="userName"',
    protectedTokens: ["async function signOut()", "await monitoring.end()", "await auth.logout()", 'await navigateTo("/")'],
  },
  {
    file: "app/layouts/librarian.vue",
    model: 'v-model:open="isLogoutModalOpen"',
    loading: ':loading="isLoggingOut"',
    handler: '@confirm="handleLogout"',
    account: ':account-name="userName"',
    protectedTokens: ["async function handleLogout()", "await monitoring.end()", "await auth.logout()", 'await navigateTo("/",'],
  },
  {
    file: "app/layouts/student.vue",
    model: 'v-model:open="logoutOpen"',
    loading: ':loading="loggingOut"',
    handler: '@confirm="signOut"',
    account: ':account-name="userName"',
    protectedTokens: ["async function signOut()", "await monitoring.end()", "await auth.logout()", 'await navigateTo("/")'],
  },
  {
    file: "app/layouts/faculty.vue",
    model: 'v-model:open="logoutOpen"',
    loading: ':loading="loggingOut"',
    handler: '@confirm="signOut"',
    account: ':account-name="userName"',
    protectedTokens: ["async function signOut()", "await monitoring.end()", "await auth.logout()", 'await navigateTo("/")'],
  },
];

for (const layout of layouts) {
  const source = read(layout.file);
  const required = [
    'import AppSignOutModal from "~/components/shared/AppSignOutModal.vue";',
    "<AppSignOutModal",
    layout.model,
    layout.loading,
    layout.handler,
    layout.account,
    ...layout.protectedTokens,
  ];
  const missing = required.filter((token) => !source.includes(token));
  if (missing.length) {
    console.error(`DS-8.3 Sign Out Modal verification failed for ${layout.file}:`);
    for (const token of missing) console.error(` - ${token}`);
    process.exit(1);
  }
}

const legacyModalTitles = [
  "Sign out of Administration?",
  "Sign out of the Student Portal?",
  "Sign out of the Faculty Portal?",
];
for (const layout of layouts) {
  const source = read(layout.file);
  for (const title of legacyModalTitles) {
    if (source.includes(title)) {
      console.error(`DS-8.3 Sign Out Modal verification failed. Legacy modal copy remains in ${layout.file}: ${title}`);
      process.exit(1);
    }
  }
}

console.log("DS-8.3 reusable Sign Out Modal verification passed.");
console.log("Administrator, Librarian, Student, and Faculty portals share one themed confirmation component while logout handlers remain intact.");
