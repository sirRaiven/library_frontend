<script setup lang="ts">
import AppSkipLink from "~/components/shared/AppSkipLink.vue";
import AppSignOutModal from "~/components/shared/AppSignOutModal.vue";
import SystemMaintenanceBanner from "~/components/shared/SystemMaintenanceBanner.vue";
import PortalMobileBottomNav from "~/components/shared/PortalMobileBottomNav.vue";
import PortalNotificationTrigger from "~/components/shared/PortalNotificationTrigger.vue";
import type {
  DropdownMenuItem,
  NavigationMenuItem,
} from "@nuxt/ui";

const route = useRoute();
const { isNavigating: pageLoading } = usePageExperience();
const auth = useAuth();
const maintenance = useSystemMaintenance();
const dashboard = useStudentDashboard();
const monitoring = useStudentSession();
const notificationCenter = useStudentNotifications();
const toast = useToast();

const sidebarOpen = ref(false);
const sidebarCollapsed = ref(false);
const logoutOpen = ref(false);
const loggingOut = ref(false);

function openMobileNavigation() {
  sidebarCollapsed.value = false;
  sidebarOpen.value = true;
}

const userName = computed(() =>
  dashboard.student.value?.fullName ||
  auth.user.value?.username ||
  "Student",
);
const studentNumber = computed(() =>
  dashboard.student.value?.studentNo || "Student account",
);
const userInitials = computed(() => {
  const parts = userName.value.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "S";
});

function active(path: string, exact = false) {
  return exact
    ? route.path === path
    : route.path === path || route.path.startsWith(`${path}/`);
}

const navigationItems = computed<NavigationMenuItem[][]>(() => [
  [
    { label: "Student Portal", type: "label" },
    {
      label: "Dashboard",
      icon: "i-lucide-layout-dashboard",
      to: "/student/dashboard",
      active: active("/student/dashboard", true),
    },
  ],
  [
    { label: "Library Services", type: "label" },
    {
      label: "Book Collection",
      icon: "i-lucide-book-open",
      to: "/student/books",
      active: active("/student/books"),
    },
    {
      label: "My Borrowed Books",
      icon: "i-lucide-book-open-check",
      to: "/student/borrowings",
      active: active("/student/borrowings"),
    },
    {
      label: "My Reservations",
      icon: "i-lucide-bookmark-check",
      to: "/student/reservations",
      active: active("/student/reservations"),
    },
    {
      label: "My History",
      icon: "i-lucide-history",
      to: "/student/history",
      active: active("/student/history"),
    },
    {
      label: "Digital Library Card",
      icon: "i-lucide-id-card",
      to: "/student/library-card",
      active: active("/student/library-card"),
    },
  ],
  [
    { label: "Account", type: "label" },
    {
      label:
        notificationCenter.badgeCount.value > 0
          ? `Notifications (${notificationCenter.chipText.value} unread)`
          : "Notifications",
      icon:
        notificationCenter.badgeCount.value > 0
          ? "i-lucide-bell-ring"
          : "i-lucide-bell",
      to: "/student/notifications",
      active: active("/student/notifications"),
    },
    {
      label: "My Account",
      icon: "i-lucide-user-round-cog",
      to: "/student/security",
      active: active("/student/security"),
    },
  ],
]);

function pageInformation() {
  const path = route.path;

  if (path.startsWith("/student/books")) {
    return { title: "Book Collection", icon: "i-lucide-book-open" };
  }
  if (path.startsWith("/student/borrowings")) {
    return { title: "My Borrowed Books", icon: "i-lucide-book-open-check" };
  }
  if (path.startsWith("/student/reservations")) {
    return { title: "My Reservations", icon: "i-lucide-bookmark-check" };
  }
  if (path.startsWith("/student/history")) {
    return { title: "My History", icon: "i-lucide-history" };
  }
  if (path.startsWith("/student/library-card")) {
    return { title: "Library Card", icon: "i-lucide-id-card" };
  }
  if (path.startsWith("/student/notifications")) {
    return { title: "Notifications", icon: "i-lucide-bell" };
  }
  if (path.startsWith("/student/security")) {
    return { title: "My Account", icon: "i-lucide-user-round-cog" };
  }

  return { title: "Student Dashboard", icon: "i-lucide-layout-dashboard" };
}

const pageTitle = computed(() =>
  String(route.meta.title || pageInformation().title),
);
const pageIcon = computed(() => pageInformation().icon);

const mobileNavigationItems = computed(() => [
  {
    label: "Home",
    icon: "i-lucide-house",
    to: "/student/dashboard",
    active: active("/student/dashboard", true),
  },
  {
    label: "Books",
    icon: "i-lucide-book-open",
    to: "/student/books",
    active: active("/student/books"),
  },
  {
    label: "Borrowed",
    icon: "i-lucide-book-open-check",
    to: "/student/borrowings",
    active: active("/student/borrowings"),
  },
  {
    label: "Reserved",
    icon: "i-lucide-bookmark-check",
    to: "/student/reservations",
    active: active("/student/reservations"),
  },
]);

const mobileMoreActive = computed(() =>
  active("/student/history") ||
  active("/student/library-card") ||
  active("/student/notifications") ||
  active("/student/security"),
);


const accountItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: userName.value,
      description: studentNumber.value,
      type: "label",
      avatar: { text: userInitials.value },
    },
  ],
  [
    {
      label:
        notificationCenter
          .badgeCount.value > 0
          ? `Notifications (${notificationCenter.chipText.value})`
          : "Notifications",
      icon: "i-lucide-bell",
      to: "/student/notifications",
    },
    {
      label: "My Account",
      icon: "i-lucide-user-round-cog",
      to: "/student/security",
    },
    {
      label: "Change color mode",
      icon: "i-lucide-sun-moon",
      onSelect: () => {
        const colorMode = useColorMode();
        colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
      },
    },
  ],
  [
    {
      label: "Sign Out",
      icon: "i-lucide-log-out",
      color: "error",
      onSelect: () => {
        logoutOpen.value = true;
      },
    },
  ],
]);

async function initializeMonitoring() {
  try {
    await monitoring.start();
  } catch (error) {
    toast.add({
      title: "Session monitoring unavailable",
      description:
        "Your Student Portal data remains protected, but this device session could not be registered. Please refresh or contact the Library if the issue continues.",
      color: "warning",
      icon: "i-lucide-shield-alert",
    });
  }
}

async function signOut() {
  if (loggingOut.value) return;
  loggingOut.value = true;

  try {
    await monitoring.end();
    await auth.logout();
    await navigateTo("/");
  } finally {
    loggingOut.value = false;
    logoutOpen.value = false;
  }
}

onMounted(async () => {
  await maintenance.refresh().catch(() => undefined);
  await auth.initialize();
  await initializeMonitoring();
  notificationCenter.startPolling(120_000);
});


onBeforeUnmount(() => {
  notificationCenter.stopPolling();
});
</script>

<template>
  <AppSkipLink />
  <UDashboardGroup
    storage="local"
    storage-key="sncbt-student-dashboard"
    unit="rem"
    class="sncbt-has-mobile-bottom-nav sncbt-density-comfortable min-h-dvh bg-[var(--sncbt-canvas)] text-default"
  >
    <UDashboardSidebar
      id="student-main-navigation"
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
        root: 'sncbt-sidebar-surface sncbt-app-sidebar overflow-hidden border-e lg:transition-[width] lg:duration-150 lg:ease-out',
        header: 'border-b border-default/70 bg-transparent px-3 py-3',
        body: 'gap-2 overflow-y-auto overscroll-contain px-2 py-3 ps-4 [scrollbar-gutter:stable]',
        footer: 'border-t border-default/70 bg-transparent px-2 py-3',
        content: 'sncbt-sidebar-surface sncbt-sidebar-mobile-content w-[min(90vw,21rem)] max-w-none',
        overlay: 'bg-black/35',
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/student/dashboard"
          class="flex min-w-0 flex-1 items-center rounded-xl py-1 outline-none ring-primary transition-[gap,padding,background-color] duration-300 hover:bg-elevated/60 focus-visible:ring-2"
          :class="collapsed ? 'justify-center gap-0 px-0' : 'gap-3 px-1.5'"
          aria-label="Open Student Portal dashboard"
        >
          <div class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-default bg-white p-1 shadow-sm">
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
            class="min-w-0 overflow-hidden transition-[max-width,opacity,transform] duration-200"
            :class="collapsed ? 'pointer-events-none max-w-0 -translate-x-1 opacity-0' : 'max-w-52 opacity-100'"
            :aria-hidden="collapsed"
          >
            <p class="truncate text-sm font-bold text-highlighted">SNCBT Library</p>
            <p class="truncate text-xs text-muted">Student Portal</p>
          </div>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="navigationItems"
          orientation="vertical"
          :collapsed="collapsed"
          :tooltip="{
            delayDuration: 150,
            content: { side: 'right', align: 'center', sideOffset: 10 },
            arrow: true,
          }"
          color="primary"
          variant="pill"
          highlight
          class="sncbt-navigation w-full"
          :ui="{
            root: 'w-full gap-1',
            list: 'w-full gap-1',
            item: 'w-full',
            link: collapsed
              ? 'min-h-10 justify-center rounded-lg px-0 transition-colors duration-150'
              : 'min-h-10 rounded-lg px-3 transition-colors duration-150',
            linkLeadingIcon: 'size-5',
            linkLabel: 'text-sm font-medium',
            label: 'px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted',
          }"
          @click="sidebarOpen = false"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="accountItems"
          :content="{ align: 'start', side: 'top', sideOffset: 8 }"
          :ui="{ content: 'w-64' }"
        >
          <UButton
            color="neutral"
            variant="ghost"
            :block="!collapsed"
            :square="collapsed"
            class="w-full rounded-xl"
            :aria-label="collapsed ? `Open account menu for ${userName}` : 'Open Student account menu'"
            :ui="{ base: collapsed ? 'justify-center' : 'justify-start' }"
          >
            <UAvatar :alt="userName" :text="userInitials" size="sm" class="shrink-0" />
            <div
              class="min-w-0 overflow-hidden text-left transition-[max-width,opacity] duration-200"
              :class="collapsed ? 'pointer-events-none max-w-0 opacity-0' : 'max-w-44 flex-1 opacity-100'"
            >
              <p class="truncate text-sm font-semibold text-highlighted">{{ userName }}</p>
              <p class="truncate text-xs text-muted">{{ studentNumber }}</p>
            </div>
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel
      id="student-main"
      :ui="{ root: 'min-w-0 bg-[var(--sncbt-canvas)]', body: 'sncbt-dashboard-canvas sncbt-mobile-nav-scrollport p-0 sm:p-0' }"
    >
      <template #header>
        <UDashboardNavbar
          :title="pageTitle"
          :icon="pageIcon"
          :toggle="false"
          :ui="{
            root: 'sncbt-navbar-surface sncbt-app-navbar border-b px-2 sm:px-4 lg:px-6',
            left: 'min-w-0 gap-1 sm:gap-1.5',
            icon: 'hidden size-5 sm:block',
            title: 'max-w-[12rem] truncate text-sm font-semibold sm:hidden',
            right: 'gap-1',
          }"
        >
          <template #toggle="{ sidebarCollapsed: collapsed }">
            <UTooltip :text="collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'">
              <UDashboardSidebarCollapse
                class="hidden lg:inline-flex"
                icon="i-lucide-panel-left"
                color="neutral"
                :variant="collapsed ? 'soft' : 'ghost'"
                square
                :aria-expanded="!collapsed"
                :aria-label="collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'"
                aria-controls="sncbt-student-dashboard-sidebar-student-main-navigation"
              />
            </UTooltip>
          </template>

          <template #right>
            <PortalNotificationTrigger
              to="/student/notifications"
              :count="notificationCenter.badgeCount.value"
              :active="active('/student/notifications')"
            />

            <UColorModeButton class="hidden sm:inline-flex" color="neutral" variant="ghost" />
            <UDropdownMenu
              :items="accountItems"
              :content="{ align: 'end', sideOffset: 8 }"
              :ui="{ content: 'w-64' }"
            >
              <UButton color="neutral" variant="ghost" square aria-label="Open Student account menu">
                <UAvatar :alt="userName" :text="userInitials" size="sm" />
              </UButton>
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <main id="main-content" class="sncbt-mobile-bottom-nav-spacer min-h-[calc(100dvh-var(--ui-header-height))] text-default transition-colors">
          <div class="sncbt-portal-frame">
            <SystemMaintenanceBanner />
            <div class="sncbt-portal-view">
              <AppPageLoadingSkeleton v-if="pageLoading" />
              <slot />
            </div>
          </div>
        </main>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>

  <PortalMobileBottomNav
    :items="mobileNavigationItems"
    :more-active="mobileMoreActive"
    more-controls="sncbt-student-dashboard-sidebar-student-main-navigation"
    @more="openMobileNavigation"
  />

  <AppSignOutModal
    v-model:open="logoutOpen"
    :loading="loggingOut"
    description="Your Student Portal session will be closed. You will need to sign in again to access your Library records."
    :account-name="userName"
    :account-detail="studentNumber"
    @confirm="signOut"
  />
</template>
