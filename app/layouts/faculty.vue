<script setup lang="ts">
import AppSkipLink from "~/components/shared/AppSkipLink.vue";
import SystemMaintenanceBanner from "~/components/shared/SystemMaintenanceBanner.vue";
import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";
import { appLogger } from "~/utils/app-logger";

const route = useRoute();
const auth = useAuth();
const maintenance = useSystemMaintenance();
const portal = useFacultyPortal();
const monitoring = usePortalMonitoring();

const sidebarOpen = ref(false);
const sidebarCollapsed = ref(false);
const logoutOpen = ref(false);
const loggingOut = ref(false);

const faculty = computed(() => portal.dashboard.value.faculty);
const userName = computed(
  () => faculty.value?.fullName || auth.user.value?.username || "Faculty",
);
const employeeNo = computed(
  () => faculty.value?.employeeNo || "Faculty account",
);
const initials = computed(() => {
  const parts = userName.value.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "F";
});

function active(path: string, exact = false) {
  return exact
    ? route.path === path
    : route.path === path || route.path.startsWith(`${path}/`);
}

const navigationItems = computed<NavigationMenuItem[][]>(() => [
  [
    { label: "Faculty Portal", type: "label" },
    {
      label: "Dashboard",
      icon: "i-lucide-layout-dashboard",
      to: "/faculty/dashboard",
      active: active("/faculty/dashboard", true),
    },
  ],
  [
    { label: "Library Services", type: "label" },
    {
      label: "Book Collection",
      icon: "i-lucide-book-open",
      to: "/faculty/books",
      active: active("/faculty/books"),
    },
    {
      label: "Borrowed Department Books",
      icon: "i-lucide-library-big",
      to: "/faculty/borrowings",
      active: active("/faculty/borrowings"),
    },
    {
      label: "Book Status Reports",
      icon: "i-lucide-clipboard-check",
      to: "/faculty/reports",
      active: active("/faculty/reports"),
    },
  ],
  [
    { label: "Account", type: "label" },
    {
      label: "My Faculty Profile",
      icon: "i-lucide-user-round-cog",
      to: "/faculty/profile",
      active: active("/faculty/profile"),
    },
  ],
]);

function pageInfo() {
  const path = route.path;
  if (path.startsWith("/faculty/books")) {
    return { title: "Book Collection", icon: "i-lucide-book-open" };
  }
  if (path.startsWith("/faculty/borrowings")) {
    return { title: "Borrowed Department Books", icon: "i-lucide-library-big" };
  }
  if (path.startsWith("/faculty/reports")) {
    return { title: "Book Status Reports", icon: "i-lucide-clipboard-check" };
  }
  if (path.startsWith("/faculty/profile")) {
    return { title: "Faculty Profile", icon: "i-lucide-user-round-cog" };
  }
  return { title: "Faculty Dashboard", icon: "i-lucide-layout-dashboard" };
}

const pageTitle = computed(() => String(route.meta.title || pageInfo().title));
const pageIcon = computed(() => pageInfo().icon);

const accountItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: userName.value,
      description: employeeNo.value,
      type: "label",
      avatar: { text: initials.value },
    },
  ],
  [
    {
      label: "My Faculty Profile",
      icon: "i-lucide-user-round-cog",
      to: "/faculty/profile",
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
  // The dashboard page loads its own data. Avoid issuing the same request twice
  // when the Faculty first signs in. Other Faculty pages still load the small
  // dashboard summary once so the sidebar can display the account details.
  if (route.path !== "/faculty/dashboard" && !portal.dashboard.value.faculty) {
    void portal.loadDashboard().catch(() => undefined);
  }

  try {
    await monitoring.start();
    await monitoring.recordPageView(route.path, pageTitle.value);
  } catch (error) {
    appLogger.warn("Unable to initialize Faculty portal monitoring.", error);
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
    storage-key="sncbt-faculty-dashboard"
    unit="rem"
    class="min-h-dvh bg-[var(--sncbt-canvas)] text-default"
  >
    <UDashboardSidebar
      id="faculty-main-navigation"
      v-model:open="sidebarOpen"
      v-model:collapsed="sidebarCollapsed"
      collapsible
      :collapsed-size="4.5"
      :default-size="18"
      :min-size="17"
      :max-size="22"
      mode="slideover"
      :auto-close="true"
      :toggle="{
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-x',
      }"
      :ui="{
        root: 'sncbt-sidebar-surface overflow-hidden border-e transition-[width] duration-300',
        header: 'border-b border-default/70 bg-transparent px-3 py-3',
        body: 'gap-2 overflow-y-auto px-2 py-3 ps-4',
        footer: 'border-t border-default/70 bg-transparent px-2 py-3',
        content: 'sncbt-sidebar-surface w-[min(88vw,22rem)] max-w-none shadow-2xl',
        overlay: 'bg-black/40 backdrop-blur-[1px]',
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/faculty/dashboard"
          class="flex min-w-0 flex-1 items-center rounded-xl py-1 outline-none ring-primary transition-all hover:bg-elevated/60 focus-visible:ring-2"
          :class="collapsed ? 'justify-center px-0' : 'gap-3 px-1.5'"
        >
          <div class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-default bg-white p-1 shadow-sm">
            <img
              src="/sncbt-library-logo.png"
              alt="SNCBT Library logo"
              class="size-full object-contain"
            >
          </div>
          <div
            class="min-w-0 overflow-hidden transition-all"
            :class="collapsed ? 'pointer-events-none max-w-0 opacity-0' : 'max-w-52 opacity-100'"
          >
            <p class="truncate text-sm font-bold text-highlighted">SNCBT Library</p>
            <p class="truncate text-xs text-muted">Faculty Portal</p>
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
          class="w-full"
          :ui="{
            root: 'w-full gap-1',
            list: 'w-full gap-1',
            item: 'w-full',
            link: collapsed
              ? 'min-h-10 justify-center rounded-lg px-0'
              : 'min-h-10 rounded-lg px-3',
            linkLeadingIcon: 'size-5',
            linkLabel: 'text-xs font-medium',
            label: 'px-1 pb-1 pt-2 text-[8px] font-bold uppercase tracking-[0.1em] text-muted',
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
            :ui="{ base: collapsed ? 'justify-center' : 'justify-start' }"
          >
            <UAvatar :alt="userName" :text="initials" size="sm" class="shrink-0" />
            <div
              class="min-w-0 overflow-hidden text-left transition-all"
              :class="collapsed ? 'pointer-events-none max-w-0 opacity-0' : 'max-w-44 flex-1 opacity-100'"
            >
              <p class="truncate text-sm font-semibold text-highlighted">{{ userName }}</p>
              <p class="truncate text-xs text-muted">{{ employeeNo }}</p>
            </div>
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel
      id="faculty-main"
      :ui="{ root: 'min-w-0 bg-transparent', body: 'p-0 sm:p-0' }"
    >
      <template #header>
        <UDashboardNavbar
          :title="pageTitle"
          :icon="pageIcon"
          :toggle="false"
          :ui="{
            root: 'sncbt-navbar-surface border-b px-2 sm:px-4 lg:px-6',
            left: 'min-w-0 gap-1 sm:gap-1.5',
            icon: 'hidden size-5 sm:block',
            title: 'max-w-[14rem] truncate text-sm font-semibold sm:max-w-none sm:text-base',
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
              />
            </UTooltip>
            <UTooltip :text="collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'">
              <UDashboardSidebarCollapse
                icon="i-lucide-panel-left"
                color="neutral"
                :variant="collapsed ? 'soft' : 'ghost'"
                square
              />
            </UTooltip>
          </template>

          <template #right>
            <UTooltip text="Change color mode">
              <UColorModeButton color="neutral" variant="ghost" />
            </UTooltip>
            <UDropdownMenu :items="accountItems" :content="{ align: 'end' }">
              <UButton color="neutral" variant="ghost" square>
                <UAvatar :text="initials" :alt="userName" size="xs" />
              </UButton>
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <main id="main-content" class="sncbt-dashboard-canvas min-h-[calc(100dvh-var(--ui-header-height))] text-default transition-colors">
          <div class="mx-auto w-full max-w-[1600px]">
            <SystemMaintenanceBanner />
            <slot />
          </div>
        </main>
      </template>
    </UDashboardPanel>

    <UModal v-model:open="logoutOpen" :dismissible="!loggingOut">
      <template #content>
        <div class="space-y-5 bg-transparent p-6">
          <div class="flex items-start gap-3">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
              <UIcon name="i-lucide-log-out" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-highlighted">Sign out of the Faculty Portal?</h2>
              <p class="mt-1 text-sm text-muted">You will need to sign in again to view department Library records.</p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <UButton label="Stay Signed In" color="neutral" variant="outline" :disabled="loggingOut" @click="logoutOpen = false" />
            <UButton label="Sign Out" icon="i-lucide-log-out" color="error" :loading="loggingOut" @click="signOut" />
          </div>
        </div>
      </template>
    </UModal>
  </UDashboardGroup>
</template>
