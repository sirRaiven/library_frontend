<script setup lang="ts">
import AppSkipLink from "~/components/shared/AppSkipLink.vue";
import AppSignOutModal from "~/components/shared/AppSignOutModal.vue";
import SystemMaintenanceBanner from "~/components/shared/SystemMaintenanceBanner.vue";
import PortalNotificationTrigger from "~/components/shared/PortalNotificationTrigger.vue";

import { appLogger } from "~/utils/app-logger";
import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();
const { isNavigating: pageLoading } = usePageExperience();
const auth = useAuth();
const maintenance = useSystemMaintenance();
const toast = useToast();
const notificationCenter = useLibraryNotifications();
const monitoring = usePortalMonitoring();

const sidebarOpen = ref(false);
const sidebarCollapsed = ref(false);
const isLogoutModalOpen = ref(false);
const isLoggingOut = ref(false);
const globalSearch = ref("");

let desktopMediaQuery: MediaQueryList | undefined;

function closeMobileSidebarOnDesktop(event: MediaQueryListEvent) {
  if (event.matches) {
    sidebarOpen.value = false;
  }
}

const userName = computed(() => auth.user.value?.username || "Librarian");

const userEmail = computed(
  () => auth.user.value?.email || "Library staff account",
);

const userInitials = computed(() => {
  const parts = userName.value.trim().split(/\s+/).filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "L"
  );
});

const pageTitle = computed(() =>
  String(route.meta.title || getPageInformation().title),
);

const pageIcon = computed(() => getPageInformation().icon);

function getPageInformation(): {
  title: string;
  icon: string;
} {
  const path = route.path;

  if (path === "/librarian/dashboard" || path === "/librarian") {
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
      title: "Library Visits",
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

  if (path.startsWith("/librarian/reservations")) {
    return {
      title: "Reservations",
      icon: "i-lucide-calendar-check-2",
    };
  }

  if (/^\/librarian\/students\/[^/]+\/record\/?$/.test(path)) {
    return {
      title: "Student Record",
      icon: "i-lucide-notebook-tabs",
    };
  }

  if (/^\/librarian\/students\/[^/]+\/record(?:\/|$)/.test(path)) {
    return {
      title: "Student Record",
      icon: "i-lucide-notebook-tabs",
    };
  }

  if (path.startsWith("/librarian/students")) {
    return {
      title: "Students",
      icon: "i-lucide-graduation-cap",
    };
  }

  if (path.startsWith("/librarian/student-registration-approvals")) {
    return {
      title: "Registration Approvals",
      icon: "i-lucide-clipboard-check",
    };
  }

  if (path.startsWith("/librarian/student-self-registration")) {
    return {
      title: "Registration QR Code",
      icon: "i-lucide-qr-code",
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
      title: "Membership Term",
      icon: "i-lucide-calendar-range",
    };
  }

  if (path.startsWith("/librarian/memberships")) {
    return {
      title: "Library Cards",
      icon: "i-lucide-id-card",
    };
  }

  if (path.startsWith("/librarian/library-card-designer")) {
    return {
      title: "Card Design",
      icon: "i-lucide-palette",
    };
  }

  if (path.startsWith("/librarian/fines")) {
    return {
      title: "Fines & Payments",
      icon: "i-lucide-receipt-text",
    };
  }

  if (path.startsWith("/librarian/library-card-print")) {
    return {
      title: "Print Library Cards",
      icon: "i-lucide-printer",
    };
  }

  if (path.startsWith("/librarian/history")) {
    return {
      title: "History",
      icon: "i-lucide-history",
    };
  }

  if (path.startsWith("/librarian/reports")) {
    return {
      title: "Reports",
      icon: "i-lucide-chart-no-axes-combined",
    };
  }

  if (path.startsWith("/librarian/notifications")) {
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

function isRouteActive(path: string, exact = false): boolean {
  return exact
    ? route.path === path
    : route.path === path || route.path.startsWith(`${path}/`);
}

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
        label: "Library Visits",
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
      isRouteActive("/librarian/student-registration-approvals") ||
      isRouteActive("/librarian/student-self-registration") ||
      isRouteActive("/librarian/faculty") ||
      isRouteActive("/librarian/faculty-book-reports"),
    children: [
      {
        label: "Students",
        icon: "i-lucide-graduation-cap",
        to: "/librarian/students",
      },
      {
        label: "Registration Approvals",
        icon: "i-lucide-clipboard-check",
        to: "/librarian/student-registration-approvals",
      },
      {
        label: "Registration QR",
        icon: "i-lucide-qr-code",
        to: "/librarian/student-self-registration",
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
    ],
  },
  {
    label: "Membership & Cards",
    icon: "i-lucide-id-card",
    active:
      isRouteActive("/librarian/membership-term") ||
      isRouteActive("/librarian/memberships") ||
      isRouteActive("/librarian/library-card-designer") ||
      isRouteActive("/librarian/library-card-print"),
    children: [
      {
        label: "Membership Term",
        icon: "i-lucide-calendar-range",
        to: "/librarian/membership-term",
      },
      {
        label: "Library Cards",
        icon: "i-lucide-id-card",
        to: "/librarian/memberships",
      },
      {
        label: "Card Design",
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
        label: "History",
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

// Nuxt UI vertical menus use per-item defaultOpen, not a root default-open prop.
// Opening only the current section keeps the staff navigation easy to scan.
const expandedNavigationItems = computed<NavigationMenuItem[]>(() =>
  compactNavigationItems.value.map((item) => ({
    ...item,
    defaultOpen: Boolean(item.active && item.children?.length),
  })),
);

function getCompactChildItems(item: NavigationMenuItem): DropdownMenuItem[][] {
  const children = Array.isArray(item.children) ? item.children : [];

  return [
    children.map((child) => ({
      label: String(child.label || "Open"),
      icon: typeof child.icon === "string" ? child.icon : undefined,
      to: child.to,
    })),
  ];
}

function handleSidebarNavigationClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const anchor =
    target?.closest<HTMLAnchorElement>("a[href]");

  if (!anchor) {
    return;
  }

  // Preserve normal browser behavior for opening links
  // in another tab or window.
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey ||
    anchor.target === "_blank"
  ) {
    return;
  }

  const destination = new URL(
    anchor.href,
    window.location.origin,
  );

  if (destination.origin !== window.location.origin) {
    return;
  }

  const destinationRoute =
    `${destination.pathname}${destination.search}${destination.hash}`;

  // Normal navigation is closed by the route watcher after
  // Nuxt has actually changed the page. Clicking the current
  // page should still close the mobile sidebar immediately.
  if (destinationRoute === route.fullPath) {
    sidebarOpen.value = false;
  }
}

const accountMenuItems = computed<DropdownMenuItem[][]>(() => [
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
        notificationCenter.badgeCount.value > 0
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
      description: "Your librarian session has been closed.",
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
  await maintenance.refresh().catch(() => undefined);
  await auth.initialize();
  notificationCenter.startPolling(120_000);

  try {
    await monitoring.start();
    await monitoring.recordPageView(route.path, pageTitle.value);
  } catch (error) {
    appLogger.warn("Unable to initialize Librarian portal monitoring.", error);
  }

  desktopMediaQuery = window.matchMedia("(min-width: 1024px)");
  desktopMediaQuery.addEventListener("change", closeMobileSidebarOnDesktop);
});

onBeforeUnmount(() => {
  notificationCenter.stopPolling();

  desktopMediaQuery?.removeEventListener("change", closeMobileSidebarOnDesktop);
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
  <AppSkipLink />
  <UDashboardGroup
    storage="local"
    storage-key="sncbt-librarian-dashboard"
    unit="rem"
    class="sncbt-density-compact min-h-dvh bg-[var(--sncbt-canvas)] text-default"
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
          'sncbt-sidebar-surface sncbt-app-sidebar overflow-hidden',
          'lg:transition-[width] lg:duration-150 lg:ease-out',
          'motion-reduce:transition-none',
          'data-[dragging=true]:transition-none',
        ].join(' '),
        header: [
          'border-b border-default/70 bg-transparent px-3 py-3',
          'px-3 py-3',
        ].join(' '),
        body: [
          'min-w-0 gap-1.5 px-2.5 py-3',
          'overflow-y-auto overflow-x-hidden overscroll-contain',
          '[scrollbar-gutter:stable]',
        ].join(' '),
        footer: [
          'border-t border-default/70 bg-transparent px-2 py-3',
          'px-2.5 py-3',
        ].join(' '),
        content: [
          'w-[min(90vw,21rem)] max-w-none',
          'sncbt-sidebar-surface sncbt-sidebar-mobile-content',
        ].join(' '),
        overlay: 'bg-black/35',
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/librarian/dashboard"
          class="flex min-w-0 flex-1 items-center rounded-xl py-1 outline-none ring-primary transition-[gap,padding,background-color] duration-300 ease-out hover:bg-elevated/60 focus-visible:ring-2 motion-reduce:transition-none"
          :class="collapsed ? 'justify-center gap-0 px-0' : 'gap-3 px-1.5'"
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
            />
          </div>

          <div
            class="min-w-0 overflow-hidden transition-[max-width,opacity] duration-150 ease-out motion-reduce:transition-none"
            :class="
              collapsed
                ? 'pointer-events-none max-w-0 -translate-x-1 opacity-0'
                : 'max-w-48 translate-x-0 opacity-100'
            "
            :aria-hidden="collapsed"
          >
            <p class="truncate text-sm font-bold text-highlighted">
              SNCBT Library
            </p>
            <p class="truncate text-xs text-muted">Management System</p>
          </div>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <div class="w-full">
          <UNavigationMenu
            v-if="!collapsed"
            :key="`librarian-menu:${route.path.split('/').slice(0, 3).join('/')}`"
            :items="expandedNavigationItems"
            orientation="vertical"
            type="multiple"
            :collapsible="true"
            :highlight="true"
            highlight-color="primary"
            color="primary"
            variant="pill"
            class="sncbt-navigation sncbt-librarian-navigation w-full min-w-0"
            aria-label="Librarian portal navigation"
            @click="handleSidebarNavigationClick"
          />

          <div
            v-else
            class="sncbt-navigation sncbt-librarian-compact-nav flex w-full min-w-0 flex-col items-center gap-1.5"
            aria-label="Compact Librarian portal navigation"
          >
            <template
              v-for="item in compactNavigationItems"
              :key="String(item.label)"
            >
              <UTooltip
                v-if="item.to"
                :text="String(item.label)"
                :content="{
                  side: 'right',
                  align: 'center',
                  sideOffset: 10,
                  collisionPadding: 12,
                }"
                :delay-duration="150"
                arrow
              >
                <UButton
                  :to="item.to"
                  :icon="item.icon"
                  color="primary"
                  :variant="item.active ? 'soft' : 'ghost'"
                  square
                  class="size-10 rounded-xl"
                  :aria-label="String(item.label)"
                />
              </UTooltip>

              <UDropdownMenu
                v-else
                :items="getCompactChildItems(item)"
                :content="{
                  side: 'right',
                  align: 'start',
                  sideOffset: 10,
                  collisionPadding: 12,
                }"
                :ui="{
                  content: 'min-w-56',
                }"
              >
                <UTooltip
                  :text="String(item.label)"
                  :content="{
                    side: 'right',
                    align: 'center',
                    sideOffset: 10,
                    collisionPadding: 12,
                  }"
                  :delay-duration="150"
                  arrow
                >
                  <UButton
                    :icon="item.icon"
                    color="primary"
                    :variant="item.active ? 'soft' : 'ghost'"
                    square
                    class="size-10 rounded-xl"
                    :aria-label="`Open ${String(item.label)} navigation`"
                    aria-haspopup="menu"
                  />
                </UTooltip>
              </UDropdownMenu>
            </template>
          </div>
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
              base: collapsed ? 'justify-center' : 'justify-start',
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
              <p class="truncate text-sm font-semibold text-highlighted">
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
        root: 'min-w-0 bg-[var(--sncbt-canvas)]',
        body: 'sncbt-dashboard-canvas p-0 sm:p-0',
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
              'sncbt-navbar-surface sncbt-app-navbar border-b',
              'px-2 sm:px-4 lg:px-6',
              'transition-colors duration-200',
            ].join(' '),
            left: 'min-w-0 gap-1 sm:gap-1.5',
            icon: 'hidden size-5 shrink-0 sm:block',
            title: 'max-w-[10rem] truncate text-sm font-semibold sm:hidden',
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
                class="lg:hidden"
                icon="i-lucide-panel-left"
                color="neutral"
                :variant="dashboardSidebarOpen ? 'soft' : 'ghost'"
                square
                :aria-expanded="dashboardSidebarOpen"
                :aria-label="
                  dashboardSidebarOpen
                    ? 'Close navigation menu'
                    : 'Open navigation menu'
                "
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
                class="hidden lg:inline-flex"
                icon="i-lucide-panel-left"
                color="neutral"
                :variant="dashboardSidebarCollapsed ? 'soft' : 'ghost'"
                square
                :aria-expanded="!dashboardSidebarCollapsed"
                :aria-label="
                  dashboardSidebarCollapsed
                    ? 'Expand navigation sidebar'
                    : 'Collapse navigation sidebar'
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

            <PortalNotificationTrigger
              to="/librarian/notifications"
              :count="notificationCenter.badgeCount.value"
              :active="isRouteActive('/librarian/notifications')"
            />

            <UTooltip
              text="Change color mode"
              :content="{
                side: 'bottom',
                sideOffset: 8,
              }"
            >
              <UColorModeButton
                aria-label="Change color mode"
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
                <UAvatar :alt="userName" :text="userInitials" size="sm" />
              </UButton>
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <main
          id="main-content"
          class="min-h-[calc(100dvh-var(--ui-header-height))] text-default transition-colors duration-200"
        >
          <div class="sncbt-portal-frame">
            <SystemMaintenanceBanner />
            <div
              class="sncbt-portal-view sncbt-librarian-view sncbt-staff-view"
            >
              <AppPageLoadingSkeleton v-if="pageLoading" />
              <slot />
            </div>
          </div>
        </main>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>

  <AppSignOutModal
    v-model:open="isLogoutModalOpen"
    :loading="isLoggingOut"
    description="Your Librarian session will be closed. You will need to sign in again before accessing protected Library records."
    :account-name="userName"
    :account-detail="userEmail"
    @confirm="handleLogout"
  />
</template>
