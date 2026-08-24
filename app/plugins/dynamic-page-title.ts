const SITE_NAME = "SNCBT Library Management System";
const SITE_LOGO = "/sncbt-library-logo.png";

interface PageTitleRule {
  pattern: RegExp;
  title: string;
}

const PAGE_TITLE_RULES: PageTitleRule[] = [
  // Public and authentication pages
  { pattern: /^\/$/, title: "Home" },
  { pattern: /^\/(?:login|auth\/login)\/?$/, title: "Sign In" },
  { pattern: /^\/(?:forgot-password|auth\/forgot-password)\/?$/, title: "Forgot Password" },
  { pattern: /^\/(?:reset-password|auth\/reset-password)\/?$/, title: "Reset Password" },

  // Librarian pages
  { pattern: /^\/librarian\/dashboard\/?$/, title: "Library Overview" },
  { pattern: /^\/librarian\/visits\/?$/, title: "Library Entry Log" },
  { pattern: /^\/librarian\/borrow\/?$/, title: "Borrow Books" },
  { pattern: /^\/librarian\/return\/?$/, title: "Return Books" },
  { pattern: /^\/librarian\/reservations\/?$/, title: "Book Reservations" },

  { pattern: /^\/librarian\/books\/register\/?$/, title: "Add a New Book" },
  { pattern: /^\/librarian\/books\/import\/?$/, title: "Upload Book List" },
  { pattern: /^\/librarian\/books\/copies\/?$/, title: "Book Copies" },
  { pattern: /^\/librarian\/books\/print\/?$/, title: "Print Book Barcodes" },
  { pattern: /^\/librarian\/books\/[^/]+\/edit\/?$/, title: "Edit Book" },
  { pattern: /^\/librarian\/books\/[^/]+\/?$/, title: "Book Details" },
  { pattern: /^\/librarian\/books\/?$/, title: "Book Collection" },
  { pattern: /^\/librarian\/catalog\/?$/, title: "Book Catalog" },
  { pattern: /^\/librarian\/categories\/?$/, title: "Book Categories" },

  { pattern: /^\/librarian\/students\/?$/, title: "Student Records" },
  { pattern: /^\/librarian\/faculty-book-reports\/?$/, title: "Faculty Book Reports" },
  { pattern: /^\/librarian\/faculty\/?$/, title: "Faculty Records" },
  { pattern: /^\/librarian\/memberships\/?$/, title: "Library Memberships" },
  { pattern: /^\/librarian\/patrons\/?$/, title: "Library Members" },

  { pattern: /^\/librarian\/library-card-designer\/?$/, title: "Library Card Designer" },
  { pattern: /^\/librarian\/library-card-print\/?$/, title: "Print Library Cards" },

  { pattern: /^\/librarian\/notifications\/?$/, title: "Notifications" },
  { pattern: /^\/librarian\/reports\/?$/, title: "Library Reports" },
  { pattern: /^\/librarian\/circulation\/?$/, title: "Borrowing and Returning" },

  // Student Portal pages
  { pattern: /^\/student\/dashboard\/?$/, title: "Student Dashboard" },
  { pattern: /^\/student\/books\/[^/]+\/?$/, title: "Book Details" },
  { pattern: /^\/student\/books\/?$/, title: "Book Collection" },
  { pattern: /^\/student\/borrowings\/?$/, title: "My Borrowed Books" },
  { pattern: /^\/student\/borrowing-history\/?$/, title: "Borrowing History" },
  { pattern: /^\/student\/reservations\/?$/, title: "My Reservations" },
  { pattern: /^\/student\/library-card\/?$/, title: "My Library Card" },
  { pattern: /^\/student\/notifications\/?$/, title: "Notifications" },
  { pattern: /^\/student\/security\/?$/, title: "Security and Devices" },

  // Common role pages
  { pattern: /^\/faculty\/dashboard\/?$/, title: "Faculty Dashboard" },
  { pattern: /^\/faculty\/books(?:\/.*)?$/, title: "Book Collection" },
  { pattern: /^\/faculty\/borrowings\/?$/, title: "Borrowed Department Books" },
  { pattern: /^\/faculty\/reports\/?$/, title: "Book Status Reports" },
  { pattern: /^\/faculty\/profile\/?$/, title: "Faculty Profile" },
  { pattern: /^\/(?:admin|faculty)\/dashboard\/?$/, title: "Dashboard" },
  { pattern: /^\/(?:admin|student|faculty)\/profile\/?$/, title: "My Profile" },
  { pattern: /^\/(?:student|faculty)\/catalog\/?$/, title: "Book Catalog" },
  { pattern: /^\/(?:student|faculty)\/borrowed\/?$/, title: "My Borrowed Books" },
  { pattern: /^\/(?:student|faculty)\/reservations\/?$/, title: "My Reservations" },
  { pattern: /^\/admin\/users\/?$/, title: "User Accounts" },
  { pattern: /^\/admin\/librarians\/create\/?$/, title: "Add Librarian" },
  { pattern: /^\/admin\/librarians\/?$/, title: "Librarian Accounts" },
  { pattern: /^\/admin\/roles\/[^/]+\/?$/, title: "Role Details" },
  { pattern: /^\/admin\/roles\/?$/, title: "Roles and Permissions" },
  { pattern: /^\/admin\/audit-logs\/?$/, title: "Audit Trail" },
  { pattern: /^\/admin\/settings\/?$/, title: "Library Rules and Settings" },
  { pattern: /^\/admin\/operations\/?$/, title: "Library Operations" },
  { pattern: /^\/admin\/reports\/?$/, title: "System Reports" },
];

function getRoleLabel(path: string, routeMeta: Record<string, unknown>): string {
  const metaRole = routeMeta.roleTitle;

  if (typeof metaRole === "string" && metaRole.trim()) {
    return metaRole.trim();
  }

  const firstSegment = path.split("/").filter(Boolean)[0]?.toLowerCase();

  const roleLabels: Record<string, string> = {
    librarian: "Librarian",
    admin: "Administrator",
    administrator: "Administrator",
    student: "Student",
    faculty: "Faculty",
  };

  return firstSegment ? roleLabels[firstSegment] ?? "" : "";
}

function humanizeSegment(segment: string): string {
  return decodeURIComponent(segment)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, character => character.toUpperCase());
}

function getPageTitle(path: string, routeMeta: Record<string, unknown>): string {
  const metaTitle = routeMeta.title;

  if (typeof metaTitle === "string" && metaTitle.trim()) {
    return metaTitle.trim();
  }

  const matchedRule = PAGE_TITLE_RULES.find(rule => rule.pattern.test(path));

  if (matchedRule) {
    return matchedRule.title;
  }

  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "Home";
  }

  const lastSegment = segments.at(-1) ?? "";

  // Avoid showing database IDs or document IDs as browser-tab titles.
  if (
    /^\d+$/.test(lastSegment)
    || /^[a-z0-9]{16,}$/i.test(lastSegment)
  ) {
    return "Details";
  }

  return humanizeSegment(lastSegment);
}

export default defineNuxtPlugin(() => {
  const route = useRoute();

  const roleLabel = computed(() =>
    getRoleLabel(
      route.path,
      route.meta as Record<string, unknown>,
    ),
  );

  const pageTitle = computed(() =>
    getPageTitle(
      route.path,
      route.meta as Record<string, unknown>,
    ),
  );

  const titleChunk = computed(() =>
    roleLabel.value
      ? `${pageTitle.value} | ${roleLabel.value}`
      : pageTitle.value,
  );

  const fullTitle = computed(() =>
    `${titleChunk.value} | ${SITE_NAME}`,
  );

  useHead(() => ({
    title: titleChunk.value,
    meta: [
      {
        key: "og-title",
        property: "og:title",
        content: fullTitle.value,
      },
      {
        key: "og-site-name",
        property: "og:site_name",
        content: SITE_NAME,
      },
      {
        key: "og-image",
        property: "og:image",
        content: SITE_LOGO,
      },
      {
        key: "twitter-card",
        name: "twitter:card",
        content: "summary",
      },
      {
        key: "twitter-title",
        name: "twitter:title",
        content: fullTitle.value,
      },
      {
        key: "twitter-image",
        name: "twitter:image",
        content: SITE_LOGO,
      },
    ],
  }));
});
