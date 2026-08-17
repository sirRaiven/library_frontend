<script setup lang="ts">

import { appLogger } from "~/utils/app-logger";
import type {
  DropdownMenuItem,
  NavigationMenuItem,
} from "@nuxt/ui";

const route = useRoute();
const auth = useAuth();
const toast = useToast();
const notificationCenter =
  useLibraryNotifications();
const monitoring = usePortalMonitoring();

const sidebarOpen = ref(false);
const sidebarCollapsed = ref(false);
const isLogoutModalOpen = ref(false);
const isLoggingOut = ref(false);
const globalSearch = ref("");

let desktopMediaQuery: MediaQueryList | undefined;

function closeMobileSidebarOnDesktop(
  event: MediaQueryListEvent,
) {
  if (event.matches) {
    sidebarOpen.value = false;
  }
}

const userName = computed(
  () => auth.user.value?.username || "Librarian",
);

const userEmail = computed(
  () =>
    auth.user.value?.email ||
    "Library staff account",
);

const userInitials = computed(() => {
  const parts = userName.value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase(),
      )
      .join("") || "L"
  );
});

const pageTitle = computed(
  () =>
    String(
      route.meta.title ||
        getPageInformation().title,
    ),
);

const pageIcon = computed(
  () => getPageInformation().icon,
);

function getPageInformation(): {
  title: string;
  icon: string;
} {
  const path = route.path;

  if (
    path === "/librarian/dashboard" ||
    path === "/librarian"
  ) {
    return {
      title: "Library Overview",
      icon: "i-lucide-layout-dashboard",
    };
  }

  if (path.startsWith("/librarian/books")) {
    return {
      title: "Library Collection",
      icon: "i-lucide-library",
    };
  }

  if (path.startsWith("/librarian/visits")) {
    return {
      title: "Library Entry Log",
      icon: "i-lucide-scan-line",
    };
  }

  if (path.startsWith("/librarian/borrow")) {
    return {
      title: "Borrow a Book",
      icon: "i-lucide-book-up",
    };
  }

  if (path.startsWith("/librarian/return")) {
    return {
      title: "Return a Book",
      icon: "i-lucide-book-down",
    };
  }

  if (
    path.startsWith(
      "/librarian/reservations",
    )
  ) {
    return {
      title: "Reservations",
      icon: "i-lucide-calendar-check-2",
    };
  }

  if (path.startsWith("/librarian/students")) {
    return {
      title: "Students",
      icon: "i-lucide-graduation-cap",
    };
  }

  if (path.startsWith("/librarian/faculty-book-reports")) {
    return {
      title: "Faculty Book Reports",
      icon: "i-lucide-clipboard-check",
    };
  }

  if (path.startsWith("/librarian/faculty")) {
    return {
      title: "Faculty",
      icon: "i-lucide-briefcase-business",
    };
  }

  if (path.startsWith("/librarian/membership-term")) {
    return {
      title: "Academic Term and Membership Validity",
      icon: "i-lucide-calendar-range",
    };
  }

  if (
    path.startsWith(
      "/librarian/memberships",
    )
  ) {
    return {
      title: "Library Cards",
      icon: "i-lucide-id-card",
    };
  }

  if (
    path.startsWith(
      "/librarian/library-card-designer",
    )
  ) {
    return {
      title: "Library Card Designer",
      icon: "i-lucide-palette",
    };
  }

  if (path.startsWith("/librarian/history")) {
    return {
      title: "History Logs",
      icon: "i-lucide-history",
    };
  }

  if (path.startsWith("/librarian/reports")) {
    return {
      title: "Reports",
      icon: "i-lucide-chart-no-axes-combined",
    };
  }

  if (
    path.startsWith(
      "/librarian/notifications",
    )
  ) {
    return {
      title: "Notifications",
      icon: "i-lucide-bell",
    };
  }

  return {
    title: "Librarian Portal",
    icon: "i-lucide-library-big",
  };
}

function isRouteActive(
  path: string,
  exact = false,
): boolean {
  return exact
    ? route.path === path
    : route.path === path ||
        route.path.startsWith(`${path}/`);
}

function isBooksCatalogActive(): boolean {
  const utilityPages = [
    "/librarian/books/register",
    "/librarian/books/import",
    "/librarian/books/copies",
    "/librarian/books/print",
  ];

  return (
    route.path.startsWith("/librarian/books") &&
    !utilityPages.some(
      (path) =>
        route.path === path ||
        route.path.startsWith(`${path}/`),
    )
  );
}

const contentNavigationItems = computed(() => {
  const notificationBadge =
    notificationCenter.badgeCount.value > 0
      ? notificationCenter.chipText.value
      : undefined;

  const booksActive = route.path.startsWith("/librarian/books");
  const servicesActive =
    isRouteActive("/librarian/visits") ||
    isRouteActive("/librarian/borrow") ||
    isRouteActive("/librarian/return") ||
    isRouteActive("/librarian/fines") ||
    isRouteActive("/librarian/reservations");
  const usersActive =
    isRouteActive("/librarian/students") ||
    isRouteActive("/librarian/faculty") ||
    isRouteActive("/librarian/membership-term") ||
    isRouteActive("/librarian/memberships") ||
    isRouteActive("/librarian/library-card-designer");
  const reportsActive =
    isRouteActive("/librarian/history") ||
    isRouteActive("/librarian/reports") ||
    isRouteActive("/librarian/notifications");

  return [
    {
      title: "Dashboard",
      icon: "i-lucide-layout-dashboard",
      path: "/librarian/dashboard",
      active:
        isRouteActive("/librarian/dashboard", true) ||
        route.path === "/librarian",
    },
    {
      title: "Books & Collection",
      icon: "i-lucide-library-big",
      active: booksActive,
      children: [
        {
          title: "View Books",
          icon: "i-lucide-library",
          path: "/librarian/books",
          active: isBooksCatalogActive(),
        },
        {
          title: "Add New Book",
          icon: "i-lucide-book-plus",
          path: "/librarian/books/register",
          active: isRouteActive("/librarian/books/register"),
        },
      ],
    },
    {
      title: "Library Services",
      icon: "i-lucide-hand-helping",
      active: servicesActive,
      children: [
        {
          title: "Library Entry Log",
          icon: "i-lucide-scan-line",
          path: "/librarian/visits",
          active: isRouteActive("/librarian/visits"),
        },
        {
          title: "Borrow a Book",
          icon: "i-lucide-book-up",
          path: "/librarian/borrow",
          active: isRouteActive("/librarian/borrow"),
        },
        {
          title: "Return a Book",
          icon: "i-lucide-book-down",
          path: "/librarian/return",
          active: isRouteActive("/librarian/return"),
        },
        {
          title: "Fines & Payments",
          icon: "i-lucide-receipt-text",
          path: "/librarian/fines",
          active: isRouteActive("/librarian/fines"),
        },
        {
          title: "Reservations",
          icon: "i-lucide-calendar-check-2",
          path: "/librarian/reservations",
          active: isRouteActive("/librarian/reservations"),
        },
      ],
    },
    {
      title: "Library Users",
      icon: "i-lucide-users-round",
      active: usersActive,
      children: [
        {
          title: "Students",
          icon: "i-lucide-graduation-cap",
          path: "/librarian/students",
          active: isRouteActive("/librarian/students"),
        },
        {
          title: "Faculty",
          icon: "i-lucide-briefcase-business",
          path: "/librarian/faculty",
          active:
            isRouteActive("/librarian/faculty") &&
            !isRouteActive("/librarian/faculty-book-reports"),
        },
        {
          title: "Faculty Book Reports",
          icon: "i-lucide-clipboard-check",
          path: "/librarian/faculty-book-reports",
          active: isRouteActive("/librarian/faculty-book-reports"),
        },
        {
          title: "Academic Term & Validity",
          icon: "i-lucide-calendar-range",
          path: "/librarian/membership-term",
          active: isRouteActive("/librarian/membership-term"),
        },
        {
          title: "Library Cards",
          icon: "i-lucide-id-card",
          path: "/librarian/memberships",
          active: isRouteActive("/librarian/memberships"),
        },
        {
          title: "Design Library Card",
          icon: "i-lucide-palette",
          path: "/librarian/library-card-designer",
          active: isRouteActive("/librarian/library-card-designer"),
        },
      ],
    },
    {
      title: "Reports & Notices",
      icon: "i-lucide-chart-no-axes-combined",
      active: reportsActive,
      badge: notificationBadge,
      children: [
        {
          title: "History Logs",
          icon: "i-lucide-history",
          path: "/librarian/history",
          active: isRouteActive("/librarian/history"),
        },
        {
          title: "Reports",
          icon: "i-lucide-chart-no-axes-combined",
          path: "/librarian/reports",
          active: isRouteActive("/librarian/reports"),
        },
        {
          title: "Notifications",
          icon: "i-lucide-bell",
          path: "/librarian/notifications",
          active: isRouteActive("/librarian/notifications"),
          badge: notificationBadge,
        },
      ],
    },
  ];
});

const compactNavigationItems = computed<NavigationMenuItem[]>(() => [
  {
    label: "Dashboard",
    icon: "i-lucide-layout-dashboard",
    to: "/librarian/dashboard",
    active:
      isRouteActive("/librarian/dashboard", true) ||
      route.path === "/librarian",
  },
  {
    label: "Books & Collection",
    icon: "i-lucide-library-big",
    active: route.path.startsWith("/librarian/books"),
    children: [
      {
        label: "View Books",
        icon: "i-lucide-library",
        to: "/librarian/books",
      },
      {
        label: "Add New Book",
        icon: "i-lucide-book-plus",
        to: "/librarian/books/register",
      },
    ],
  },
  {
    label: "Library Services",
    icon: "i-lucide-hand-helping",
    active:
      isRouteActive("/librarian/visits") ||
      isRouteActive("/librarian/borrow") ||
      isRouteActive("/librarian/return") ||
      isRouteActive("/librarian/fines") ||
      isRouteActive("/librarian/reservations"),
    children: [
      {
        label: "Library Entry Log",
        icon: "i-lucide-scan-line",
        to: "/librarian/visits",
      },
      {
        label: "Borrow a Book",
        icon: "i-lucide-book-up",
        to: "/librarian/borrow",
      },
      {
        label: "Return a Book",
        icon: "i-lucide-book-down",
        to: "/librarian/return",
      },
      {
        label: "Fines & Payments",
        icon: "i-lucide-receipt-text",
        to: "/librarian/fines",
      },
      {
        label: "Reservations",
        icon: "i-lucide-calendar-check-2",
        to: "/librarian/reservations",
      },
    ],
  },
  {
    label: "Library Users",
    icon: "i-lucide-users-round",
    active:
      isRouteActive("/librarian/students") ||
      isRouteActive("/librarian/faculty") ||
      isRouteActive("/librarian/membership-term") ||
      isRouteActive("/librarian/memberships") ||
      isRouteActive("/librarian/library-card-designer"),
    children: [
      {
        label: "Students",
        icon: "i-lucide-graduation-cap",
        to: "/librarian/students",
      },
      {
        label: "Faculty",
        icon: "i-lucide-briefcase-business",
        to: "/librarian/faculty",
      },
      {
        label: "Faculty Book Reports",
        icon: "i-lucide-clipboard-check",
        to: "/librarian/faculty-book-reports",
      },
      {
        label: "Academic Term & Validity",
        icon: "i-lucide-calendar-range",
        to: "/librarian/membership-term",
      },
      {
        label: "Library Cards",
        icon: "i-lucide-id-card",
        to: "/librarian/memberships",
      },
      {
        label: "Design Library Card",
        icon: "i-lucide-palette",
        to: "/librarian/library-card-designer",
      },
    ],
  },
  {
    label: "Reports & Notices",
    icon: "i-lucide-chart-no-axes-combined",
    active:
      isRouteActive("/librarian/history") ||
      isRouteActive("/librarian/reports") ||
      isRouteActive("/librarian/notifications"),
    children: [
      {
        label: "History Logs",
        icon: "i-lucide-history",
        to: "/librarian/history",
      },
      {
        label: "Reports",
        icon: "i-lucide-chart-no-axes-combined",
        to: "/librarian/reports",
      },
      {
        label:
          notificationCenter.badgeCount.value > 0
            ? `Notifications (${notificationCenter.chipText.value})`
            : "Notifications",
        icon: "i-lucide-bell",
        to: "/librarian/notifications",
      },
    ],
  },
]);

function handleSidebarNavigationClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;

  if (target?.closest("a[href]")) {
    sidebarOpen.value = false;
  }
}

const accountMenuItems =
  computed<DropdownMenuItem[][]>(() => [
    [
      {
        label: userName.value,
        type: "label",
      },
      {
        label: "Library Overview",
        icon: "i-lucide-layout-dashboard",
        to: "/librarian/dashboard",
      },
      {
        label:
          notificationCenter
            .badgeCount.value > 0
            ? `Notifications (${notificationCenter.chipText.value})`
            : "Notifications",
        icon: "i-lucide-bell",
        to: "/librarian/notifications",
      },
    ],
    [
      {
        label: "Sign out",
        icon: "i-lucide-log-out",
        color: "error",
        onSelect() {
          isLogoutModalOpen.value = true;
        },
      },
    ],
  ]);

async function submitGlobalSearch() {
  const search = globalSearch.value.trim();

  if (!search) {
    return;
  }

  await navigateTo({
    path: "/librarian/books",
    query: {
      search,
    },
  });

  globalSearch.value = "";
}

async function handleLogout() {
  if (isLoggingOut.value) {
    return;
  }

  isLoggingOut.value = true;

  try {
    await monitoring.end();
    await auth.logout();

    isLogoutModalOpen.value = false;

    toast.add({
      title: "Signed out",
      description:
        "Your librarian session has been closed.",
      color: "success",
      icon: "i-lucide-circle-check",
    });

    await navigateTo("/", {
      replace: true,
    });
  } catch (error) {
    toast.add({
      title: "Unable to sign out",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    isLoggingOut.value = false;
  }
}

onMounted(async () => {
  notificationCenter
    .startPolling(120_000);


  try {
    await monitoring.start();
    await monitoring.recordPageView(route.path, pageTitle.value);
  } catch (error) {
    appLogger.warn("Unable to initialize Librarian portal monitoring.", error);
  }

  desktopMediaQuery = window.matchMedia(
    "(min-width: 1024px)",
  );
  desktopMediaQuery.addEventListener(
    "change",
    closeMobileSidebarOnDesktop,
  );

});

onBeforeUnmount(() => {
  notificationCenter
    .stopPolling();


  desktopMediaQuery?.removeEventListener(
    "change",
    closeMobileSidebarOnDesktop,
  );
});

watch(
  () => route.fullPath,
  async () => {
    // Close the mobile sidebar after navigation.
    sidebarOpen.value = false;

    await nextTick();
    void monitoring.recordPageView(route.path, pageTitle.value);

  },
);
</script>

<template>
  <UDashboardGroup
    storage="local"
    storage-key="sncbt-librarian-dashboard"
    unit="rem"
    class="min-h-dvh bg-[var(--sncbt-canvas)] text-default"
  >
    <UDashboardSidebar
      id="main-navigation"
      v-model:open="sidebarOpen"
      v-model:collapsed="sidebarCollapsed"
      collapsible
      :collapsed-size="4.5"
      :default-size="17"
      :min-size="16"
      :max-size="21"
      mode="slideover"
      :auto-close="true"
      :toggle="{
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-x',
      }"
      :ui="{
        root: [
          'sncbt-sidebar-surface overflow-hidden',
          'transition-[width] duration-300 ease-out',
          'motion-reduce:transition-none',
          'data-[dragging=true]:transition-none',
        ].join(' '),
        header: [
          'bg-transparent',
          'px-3 py-3',
        ].join(' '),
        body: [
          'min-w-0 gap-1.5 px-2.5 py-3',
          'overflow-y-auto overflow-x-hidden overscroll-contain',
        ].join(' '),
        footer: [
          'bg-transparent',
          'px-2.5 py-3',
        ].join(' '),
        content: [
          'w-[min(88vw,20rem)] max-w-none',
          'sncbt-sidebar-surface shadow-2xl',
        ].join(' '),
        overlay: 'bg-black/40 backdrop-blur-[1px]',
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/librarian/dashboard"
          class="flex min-w-0 flex-1 items-center rounded-xl py-1 outline-none ring-primary transition-[gap,padding,background-color] duration-300 ease-out hover:bg-elevated/60 focus-visible:ring-2 motion-reduce:transition-none"
          :class="
            collapsed
              ? 'justify-center gap-0 px-0'
              : 'gap-3 px-1.5'
          "
          aria-label="Open library overview"
        >
          <div
            class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-default bg-white p-1 shadow-sm"
          >
            <img
              src="/sncbt-library-logo.png"
              alt="SNCBT Library logo"
              width="40"
              height="40"
              class="size-full object-contain"
              decoding="async"
              draggable="false"
            >
          </div>

          <div
            class="min-w-0 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none"
            :class="
              collapsed
                ? 'pointer-events-none max-w-0 -translate-x-1 opacity-0'
                : 'max-w-48 translate-x-0 opacity-100'
            "
            :aria-hidden="collapsed"
          >
            <p
              class="truncate text-sm font-bold text-highlighted"
            >
              SNCBT Library
            </p>
            <p class="truncate text-xs text-muted">
              Management System
            </p>
          </div>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <div class="w-full">
          <UContentNavigation
            v-if="!collapsed"
            :key="`librarian-content-navigation:${route.path}`"
            :navigation="contentNavigationItems"
            :default-open="true"
            type="multiple"
            :collapsible="true"
            color="primary"
            variant="pill"
            highlight
            highlight-color="primary"
            class="sncbt-librarian-navigation w-full min-w-0 max-w-full overflow-x-hidden"
            :ui="{
              root: 'w-full min-w-0 max-w-full overflow-hidden',
              list: 'w-full min-w-0 space-y-1.5',
              item: 'w-full min-w-0',
              itemWithChildren: 'w-full min-w-0',
              link: [
                'group min-h-10 w-full min-w-0 rounded-xl px-3 py-2',
                'text-sm font-medium text-muted transition-[background-color,color,box-shadow] duration-150',
                'hover:bg-primary/8 hover:text-primary',
                'data-[active]:bg-primary/12 data-[active]:font-semibold data-[active]:text-primary data-[active]:shadow-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              ].join(' '),
              trigger: [
                'font-semibold text-toned',
                'hover:bg-primary/8 hover:text-primary',
                'data-[state=open]:bg-primary/6 data-[state=open]:text-primary',
              ].join(' '),
              content: 'min-w-0 pt-1',
              listWithChildren: [
                'ms-3 w-auto min-w-0 space-y-0.5 border-s border-primary/15 ps-2 pe-1',
              ].join(' '),
              linkLeadingIcon: 'size-5 shrink-0 text-primary/85',
              linkTitle: 'min-w-0 flex-1 truncate',
              linkTrailing: 'ms-auto shrink-0',
              linkTrailingIcon: 'size-4 text-primary/60',
              linkTrailingBadge: 'max-w-20 truncate',
            }"
            aria-label="Librarian portal navigation"
            @click="handleSidebarNavigationClick"
          />

          <UNavigationMenu
            v-else
            :items="compactNavigationItems"
            orientation="vertical"
            collapsed
            :tooltip="{
              delayDuration: 150,
              content: {
                side: 'right',
                align: 'center',
                sideOffset: 10,
                collisionPadding: 12,
              },
              arrow: true,
            }"
            color="primary"
            variant="pill"
            highlight
            class="sncbt-librarian-compact-nav w-full min-w-0 overflow-hidden"
            :ui="{
              root: 'w-full min-w-0 gap-1.5',
              list: 'w-full min-w-0 gap-1.5',
              item: 'w-full min-w-0',
              link: [
                'group min-h-10 justify-center rounded-xl px-0 text-primary',
                'transition-[background-color,color,box-shadow,transform] duration-150',
                'hover:bg-primary/10 hover:text-primary',
                'data-[active]:bg-primary/14 data-[active]:text-primary data-[active]:shadow-sm',
              ].join(' '),
              linkLeadingIcon: 'size-5 text-primary',
              linkLabel: 'text-xs font-semibold text-primary',
            }"
            aria-label="Compact Librarian portal navigation"
            @click="handleSidebarNavigationClick"
          />
        </div>
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="accountMenuItems"
          :content="{
            align: 'start',
            side: 'top',
            sideOffset: 8,
          }"
          :ui="{
            content: 'w-64',
          }"
        >
          <UButton
            color="neutral"
            variant="ghost"
            :block="!collapsed"
            :square="collapsed"
            class="w-full rounded-xl transition-colors duration-150"
            :aria-label="
              collapsed
                ? `Open account menu for ${userName}`
                : 'Open account menu'
            "
            :ui="{
              base: collapsed
                ? 'justify-center'
                : 'justify-start',
            }"
          >
            <UAvatar
              :alt="userName"
              :text="userInitials"
              size="sm"
              class="shrink-0"
            />

            <div
              class="min-w-0 overflow-hidden text-left transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none"
              :class="
                collapsed
                  ? 'pointer-events-none max-w-0 -translate-x-1 opacity-0'
                  : 'max-w-44 flex-1 translate-x-0 opacity-100'
              "
              :aria-hidden="collapsed"
            >
              <p
                class="truncate text-sm font-semibold text-highlighted"
              >
                {{ userName }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ userEmail }}
              </p>
            </div>

            <UIcon
              name="i-lucide-chevrons-up-down"
              class="size-4 shrink-0 text-dimmed transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none"
              :class="
                collapsed
                  ? 'max-w-0 translate-x-1 opacity-0'
                  : 'max-w-4 translate-x-0 opacity-100'
              "
              :aria-hidden="collapsed"
            />
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel
      id="librarian-main"
      :ui="{
        root: 'min-w-0 bg-transparent',
        body: 'p-0 sm:p-0',
      }"
    >
      <template #header>
        <UDashboardNavbar
          :title="pageTitle"
          :icon="pageIcon"
          :toggle="false"
          toggle-side="left"
          :ui="{
            root: [
              'sncbt-navbar-surface border-b',
              'px-2 sm:px-4 lg:px-6',
              'transition-colors duration-200',
            ].join(' '),
            left: 'min-w-0 gap-1 sm:gap-1.5',
            icon: 'hidden size-5 shrink-0 sm:block',
            title:
              'max-w-[10rem] truncate text-sm font-semibold sm:max-w-none sm:text-base',
            right: 'gap-0.5 sm:gap-1.5',
          }"
        >
          <template
            #toggle="{
              sidebarCollapsed: dashboardSidebarCollapsed,
              sidebarOpen: dashboardSidebarOpen,
            }"
          >
            <UTooltip
              :text="
                dashboardSidebarOpen
                  ? 'Close navigation menu'
                  : 'Open navigation menu'
              "
              :content="{
                side: 'bottom',
                align: 'start',
                sideOffset: 8,
              }"
            >
              <UDashboardSidebarToggle
                icon="i-lucide-panel-left"
                color="neutral"
                :variant="
                  dashboardSidebarOpen
                    ? 'soft'
                    : 'ghost'
                "
                square
                :aria-expanded="dashboardSidebarOpen"
                aria-controls="sncbt-librarian-dashboard-sidebar-main-navigation"
              />
            </UTooltip>

            <UTooltip
              :text="
                dashboardSidebarCollapsed
                  ? 'Expand navigation sidebar'
                  : 'Collapse navigation sidebar'
              "
              :content="{
                side: 'bottom',
                align: 'start',
                sideOffset: 8,
              }"
            >
              <UDashboardSidebarCollapse
                icon="i-lucide-panel-left"
                color="neutral"
                :variant="
                  dashboardSidebarCollapsed
                    ? 'soft'
                    : 'ghost'
                "
                square
                :aria-expanded="
                  !dashboardSidebarCollapsed
                "
                aria-controls="sncbt-librarian-dashboard-sidebar-main-navigation"
              />
            </UTooltip>
          </template>

          <template #right>
            <form
              class="hidden w-64 xl:block 2xl:w-72"
              @submit.prevent="submitGlobalSearch"
            >
              <UInput
                v-model="globalSearch"
                icon="i-lucide-search"
                placeholder="Search the book collection"
                autocomplete="off"
                aria-label="Search the book collection"
                class="w-full"
              />
            </form>

            <UTooltip
              text="Open notifications"
              :content="{
                side: 'bottom',
                sideOffset: 8,
              }"
            >
              <UChip
                v-if="
                  notificationCenter
                    .badgeCount.value > 0
                "
                :text="
                  notificationCenter
                    .chipText.value
                "
                :color="
                  notificationCenter
                    .chipColor.value
                "
                size="lg"
                position="top-right"
              >
                <UButton
                  to="/librarian/notifications"
                  icon="i-lucide-bell"
                  color="neutral"
                  variant="ghost"
                  size="lg"
                  square
                  class="size-11 rounded-xl"
                  :aria-label="`Open notifications. ${notificationCenter.badgeCount.value} unread notification${notificationCenter.badgeCount.value === 1 ? '' : 's'}.`"
                />
              </UChip>

              <UButton
                v-else
                to="/librarian/notifications"
                icon="i-lucide-bell"
                color="neutral"
                variant="ghost"
                size="lg"
                square
                class="size-11 rounded-xl"
                aria-label="Open notifications"
              />
            </UTooltip>

            <UTooltip
              text="Change color mode"
              :content="{
                side: 'bottom',
                sideOffset: 8,
              }"
            >
              <UColorModeButton
                color="neutral"
                variant="ghost"
                class="hidden sm:inline-flex"
              />
            </UTooltip>

            <UDropdownMenu
              :items="accountMenuItems"
              :content="{
                align: 'end',
                sideOffset: 8,
              }"
              :ui="{
                content: 'w-64',
              }"
            >
              <UButton
                color="neutral"
                variant="ghost"
                square
                aria-label="Open account menu"
              >
                <UAvatar
                  :alt="userName"
                  :text="userInitials"
                  size="sm"
                />
              </UButton>
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <main
          class="sncbt-dashboard-canvas min-h-[calc(100dvh-var(--ui-header-height))] text-default transition-colors duration-200"
        >
          <div
            class="mx-auto w-full max-w-[1600px]"
          >
            <slot />
          </div>
        </main>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>

  <UModal
    v-model:open="isLogoutModalOpen"
    :dismissible="!isLoggingOut"
    :ui="{
      content: 'sm:max-w-md',
    }"
  >
    <template #content>
      <div class="bg-default p-6 sm:p-8">
        <div
          class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-error/10 text-error"
        >
          <UIcon
            name="i-lucide-log-out"
            class="size-7"
          />
        </div>

        <div class="mt-5 text-center">
          <h2
            class="text-xl font-bold text-highlighted"
          >
            Sign out of SNCBT Library?
          </h2>
          <p
            class="mt-2 text-sm leading-relaxed text-muted"
          >
            Your current librarian session will be
            closed. You will need to sign in again to
            access protected records.
          </p>
        </div>

        <div
          class="mt-6 flex items-center gap-3 rounded-xl border border-default bg-elevated p-4"
        >
          <UAvatar
            :alt="userName"
            :text="userInitials"
            size="md"
          />

          <div class="min-w-0">
            <p
              class="truncate text-sm font-semibold text-highlighted"
            >
              {{ userName }}
            </p>
            <p class="truncate text-xs text-muted">
              {{ userEmail }}
            </p>
          </div>
        </div>

        <div
        class="mt-6 flex flex-col-reverse gap-3 sm:flex-row"
        >
        <UButton
            label="Sign Out"
            icon="i-lucide-log-out"
            color="neutral"
            size="lg"
            variant="outline"
            block
            :loading="isLoggingOut"
            @click="handleLogout"
          />
          <UButton
            label="Cancel"
            color="error"
            
            size="lg"
            block
            :disabled="isLoggingOut"
            @click="() => {
              isLogoutModalOpen = false
            }"
          />
      </div>
      </div>
    </template>
  </UModal>
</template>
