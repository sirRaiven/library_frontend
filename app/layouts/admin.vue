<script setup lang="ts">
import AppSkipLink from "~/components/shared/AppSkipLink.vue";
import SystemMaintenanceBanner from "~/components/shared/SystemMaintenanceBanner.vue";
import { appLogger } from "~/utils/app-logger";
import type {
  DropdownMenuItem,
  NavigationMenuItem,
} from "@nuxt/ui";

const route = useRoute();
const auth = useAuth();
const maintenance = useSystemMaintenance();
const monitoring = usePortalMonitoring();


const sidebarOpen = ref(false);
const sidebarCollapsed = ref(false);
const logoutOpen = ref(false);
const loggingOut = ref(false);

const userName = computed(() =>
  auth.user.value?.username || "Administrator",
);
const userEmail = computed(() =>
  auth.user.value?.email || "System administration account",
);
const userRole = computed(() =>
  auth.role.value === "super-administrator"
    ? "Super Administrator"
    : "Administrator",
);
const userInitials = computed(() => {
  const parts = userName.value.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "A";
});

function active(path: string, exact = false) {
  return exact
    ? route.path === path
    : route.path === path || route.path.startsWith(`${path}/`);
}

const navigationItems = computed<NavigationMenuItem[][]>(() => [
  [
    { label: "Overview", type: "label" },
    {
      label: "Dashboard",
      icon: "i-lucide-layout-dashboard",
      to: "/admin/dashboard",
      active: active("/admin/dashboard", true),
    },
  ],
  [
    { label: "Accounts & Access", type: "label" },
    { label: "Users", icon: "i-lucide-users", to: "/admin/users", active: active("/admin/users") },
    { label: "Librarians", icon: "i-lucide-user-round-cog", to: "/admin/librarians", active: active("/admin/librarians") },
    { label: "Account Review", icon: "i-lucide-list-checks", to: "/admin/accounts-review", active: active("/admin/accounts-review") },
    { label: "Roles & Permissions", icon: "i-lucide-shield-check", to: "/admin/roles", active: active("/admin/roles") },
  ],
  [
    { label: "Library Management", type: "label" },
    { label: "Library Operations", icon: "i-lucide-chart-no-axes-combined", to: "/admin/operations", active: active("/admin/operations") },
    { label: "Reports", icon: "i-lucide-file-chart-column-increasing", to: "/admin/reports", active: active("/admin/reports") || active("/admin/monitoring-reports") },
    { label: "Library Settings", icon: "i-lucide-settings-2", to: "/admin/settings", active: active("/admin/settings") },
  ],
  [
    { label: "System & Monitoring", type: "label" },
    { label: "Activity Log", icon: "i-lucide-activity", to: "/admin/activity", active: active("/admin/activity") },
    { label: "Sessions", icon: "i-lucide-monitor-dot", to: "/admin/sessions", active: active("/admin/sessions") },
    { label: "Devices", icon: "i-lucide-monitor-smartphone", to: "/admin/devices", active: active("/admin/devices") },
    { label: "Audit Trail", icon: "i-lucide-scroll-text", to: "/admin/audit-logs", active: active("/admin/audit-logs") },
    { label: "System & Maintenance", icon: "i-lucide-server-cog", to: "/admin/system-health", active: active("/admin/system-health") },
  ],
]);

function pageInformation() {
  const path = route.path;

  if (/^\/admin\/users\/[^/]+\/activity/.test(path)) {
    return { title: "Account Activity", icon: "i-lucide-activity" };
  }
  if (/^\/admin\/users\/[^/]+\/sessions/.test(path)) {
    return { title: "Account Sessions", icon: "i-lucide-monitor-dot" };
  }
  if (/^\/admin\/users\/[^/]+\/devices/.test(path)) {
    return { title: "Account Devices", icon: "i-lucide-monitor-smartphone" };
  }
  if (/^\/admin\/users\/[^/]+$/.test(path)) {
    return { title: "User Details", icon: "i-lucide-user-round-cog" };
  }
  if (path.startsWith("/admin/users")) {
    return { title: "Users", icon: "i-lucide-users" };
  }
  if (path.startsWith("/admin/librarians")) {
    return { title: "Librarians", icon: "i-lucide-user-round-cog" };
  }
  if (path.startsWith("/admin/accounts-review")) {
    return { title: "Account Review", icon: "i-lucide-list-checks" };
  }
  if (path.startsWith("/admin/roles")) {
    return { title: "Roles & Permissions", icon: "i-lucide-shield-check" };
  }
  if (path.startsWith("/admin/settings")) {
    return { title: "Library Settings", icon: "i-lucide-settings-2" };
  }
  if (path.startsWith("/admin/system-health")) {
    return { title: "System & Maintenance", icon: "i-lucide-server-cog" };
  }
  if (path.startsWith("/admin/operations")) {
    return { title: "Library Operations", icon: "i-lucide-chart-no-axes-combined" };
  }
  if (path.startsWith("/admin/reports")) {
    return { title: "Reports", icon: "i-lucide-file-chart-column-increasing" };
  }
  if (path.startsWith("/admin/activity")) {
    return { title: "Activity Log", icon: "i-lucide-activity" };
  }
  if (path.startsWith("/admin/sessions")) {
    return { title: "Sessions", icon: "i-lucide-monitor-dot" };
  }
  if (path.startsWith("/admin/devices")) {
    return { title: "Devices", icon: "i-lucide-monitor-smartphone" };
  }
  if (path.startsWith("/admin/monitoring-reports")) {
    return { title: "Reports", icon: "i-lucide-file-chart-column-increasing" };
  }
  if (path.startsWith("/admin/audit-logs")) {
    return { title: "Audit Trail", icon: "i-lucide-scroll-text" };
  }

  return { title: "Dashboard", icon: "i-lucide-layout-dashboard" };
}

const pageTitle = computed(() =>
  String(route.meta.title || pageInformation().title),
);
const pageIcon = computed(() => pageInformation().icon);

const accountItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: userName.value,
      description: userRole.value,
      type: "label",
      avatar: { text: userInitials.value },
    },
  ],
  [
    {
      label: "Audit Trail",
      icon: "i-lucide-shield-check",
      to: "/admin/audit-logs",
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
  try {
    await monitoring.start();
    await monitoring.recordPageView(route.path, pageTitle.value);
  } catch (error) {
    appLogger.warn("Unable to initialize Administrator portal monitoring.", error);
  }

});

onBeforeUnmount(() => {
});

watch(
  () => route.fullPath,
  async () => {
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
    storage-key="sncbt-admin-dashboard"
    unit="rem"
    class="sncbt-density-compact min-h-dvh bg-[var(--sncbt-canvas)] text-default"
  >
    <UDashboardSidebar
      id="admin-main-navigation"
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
        root: 'sncbt-sidebar-surface sncbt-app-sidebar overflow-hidden border-e lg:transition-[width] lg:duration-150 lg:ease-out motion-reduce:transition-none data-[dragging=true]:transition-none',
        header: 'border-b border-default/70 bg-transparent px-3 py-3',
        body: 'gap-2 overflow-y-auto overscroll-contain px-2 py-3 ps-4 [scrollbar-gutter:stable]',
        footer: 'border-t border-default/70 bg-transparent px-2 py-3',
        content: 'sncbt-sidebar-surface sncbt-sidebar-mobile-content w-[min(90vw,21rem)] max-w-none',
        overlay: 'bg-black/35',
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/admin/dashboard"
          class="flex min-w-0 flex-1 items-center rounded-xl py-1 outline-none ring-primary transition-[gap,padding,background-color] duration-300 hover:bg-elevated/60 focus-visible:ring-2"
          :class="collapsed ? 'justify-center gap-0 px-0' : 'gap-3 px-1.5'"
          aria-label="Open administrator dashboard"
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
            <p class="truncate text-sm font-bold text-highlighted">
              SNCBT Library
            </p>
            <p class="truncate text-xs text-muted">
              System Administration
            </p>
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
            :aria-label="collapsed ? `Open account menu for ${userName}` : 'Open administrator account menu'"
            :ui="{ base: collapsed ? 'justify-center' : 'justify-start' }"
          >
            <UAvatar :alt="userName" :text="userInitials" size="sm" class="shrink-0" />
            <div
              class="min-w-0 overflow-hidden text-left transition-[max-width,opacity] duration-200"
              :class="collapsed ? 'pointer-events-none max-w-0 opacity-0' : 'max-w-44 flex-1 opacity-100'"
            >
              <p class="truncate text-sm font-semibold text-highlighted">
                {{ userName }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ userRole }}
              </p>
            </div>
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel
      id="admin-main"
      :ui="{ root: 'min-w-0 bg-[var(--sncbt-canvas)]', body: 'sncbt-dashboard-canvas p-0 sm:p-0' }"
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
          <template #toggle="{ sidebarCollapsed: collapsed, sidebarOpen: open }">
            <UTooltip :text="open ? 'Close navigation menu' : 'Open navigation menu'">
              <UDashboardSidebarToggle
                icon="i-lucide-panel-left"
                color="neutral"
                :variant="open ? 'soft' : 'ghost'"
                square
                :aria-expanded="open"
                aria-controls="sncbt-admin-dashboard-sidebar-admin-main-navigation"
              />
            </UTooltip>
            <UTooltip :text="collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'">
              <UDashboardSidebarCollapse
                class="hidden lg:inline-flex"
                icon="i-lucide-panel-left"
                color="neutral"
                :variant="collapsed ? 'soft' : 'ghost'"
                square
                :aria-expanded="!collapsed"
                aria-controls="sncbt-admin-dashboard-sidebar-admin-main-navigation"
              />
            </UTooltip>
          </template>

          <template #right>
            <UColorModeButton class="hidden sm:inline-flex" color="neutral" variant="ghost" />
            <UDropdownMenu
              :items="accountItems"
              :content="{ align: 'end', sideOffset: 8 }"
              :ui="{ content: 'w-64' }"
            >
              <UButton color="neutral" variant="ghost" square aria-label="Open administrator account menu">
                <UAvatar :alt="userName" :text="userInitials" size="sm" />
              </UButton>
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <main id="main-content" class="min-h-[calc(100dvh-var(--ui-header-height))] text-default transition-colors">
          <div class="sncbt-portal-frame">
            <SystemMaintenanceBanner admin />
            <div class="sncbt-portal-view sncbt-admin-view sncbt-staff-view">
              <slot />
            </div>
          </div>
        </main>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>

  <UModal
    v-model:open="logoutOpen"
    :dismissible="!loggingOut"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #content>
      <div class="bg-default p-6 sm:p-8">
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-error/10 text-error">
          <UIcon name="i-lucide-log-out" class="size-7" />
        </div>
        <div class="mt-5 text-center">
          <h2 class="text-xl font-bold text-highlighted">Sign out of Administration?</h2>
          <p class="mt-2 text-sm leading-relaxed text-muted">
            Your administrator session will be closed. Sensitive administrative pages will require authentication again.
          </p>
        </div>
        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <UButton
            label="Sign Out"
            icon="i-lucide-log-out"
            color="neutral"
            variant="outline"
            block
            :loading="loggingOut"
            @click="signOut"
          />
          <UButton
            label="Cancel"
            color="error"
            block
            :disabled="loggingOut"
            @click="() => { logoutOpen = false; }"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
