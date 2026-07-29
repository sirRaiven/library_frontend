<script setup lang="ts">
import type {
  DropdownMenuItem,
  NavigationMenuItem,
} from "@nuxt/ui";

const route = useRoute();
const auth = useAuth();
const dashboard = useStudentDashboard();
const monitoring = useStudentSession();
const toast = useToast();

const sidebarOpen = ref(false);
const sidebarCollapsed = ref(false);
const logoutOpen = ref(false);
const loggingOut = ref(false);
let heartbeat: ReturnType<typeof setInterval> | null = null;

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
      label: "Digital Library Card",
      icon: "i-lucide-id-card",
      to: "/student/library-card",
      active: active("/student/library-card"),
    },
  ],
  [
    { label: "Account", type: "label" },
    {
      label: "Notifications — Coming Soon",
      icon: "i-lucide-bell",
      disabled: true,
    },
    {
      label: "Profile and Security — Coming Soon",
      icon: "i-lucide-shield-user",
      disabled: true,
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
  if (path.startsWith("/student/library-card")) {
    return { title: "Library Card", icon: "i-lucide-id-card" };
  }
  if (path.startsWith("/student/security")) {
    return { title: "Security and Devices", icon: "i-lucide-shield-user" };
  }

  return { title: "Student Dashboard", icon: "i-lucide-layout-dashboard" };
}

const pageTitle = computed(() =>
  String(route.meta.title || pageInformation().title),
);
const pageIcon = computed(() => pageInformation().icon);

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
  await initializeMonitoring();
  heartbeat = setInterval(() => {
    void monitoring.touch();
  }, 4 * 60 * 1000);
});

watch(
  () => route.fullPath,
  () => {
    if (import.meta.client) void monitoring.touch(true);
  },
);

onBeforeUnmount(() => {
  if (heartbeat) clearInterval(heartbeat);
});
</script>

<template>
  <UDashboardGroup
    storage="cookie"
    storage-key="sncbt-student-dashboard"
    unit="rem"
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
        root: 'overflow-hidden border-e border-default bg-default transition-[width] duration-300 ease-out',
        header: 'border-b border-default bg-default/95 px-3 py-3 backdrop-blur',
        body: 'gap-2 overflow-y-auto overscroll-contain px-2 py-3 ps-4 [scrollbar-gutter:stable]',
        footer: 'border-t border-default bg-default/95 px-2 py-3 backdrop-blur',
        content: 'w-[min(88vw,21rem)] max-w-none bg-default shadow-2xl',
        overlay: 'bg-black/40 backdrop-blur-[1px]',
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
          class="w-full"
          :ui="{
            root: 'w-full gap-1',
            list: 'w-full gap-1',
            item: 'w-full',
            link: collapsed
              ? 'min-h-10 justify-center rounded-lg px-0 transition-colors duration-150'
              : 'min-h-10 rounded-lg px-3 transition-colors duration-150',
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
      :ui="{ root: 'min-w-0 bg-default', body: 'p-0 sm:p-0' }"
    >
      <template #header>
        <UDashboardNavbar
          :title="pageTitle"
          :icon="pageIcon"
          :toggle="false"
          :ui="{
            root: 'border-b border-default bg-default/90 px-2 backdrop-blur sm:px-4 lg:px-6',
            left: 'min-w-0 gap-1 sm:gap-1.5',
            icon: 'hidden size-5 sm:block',
            title: 'max-w-[12rem] truncate text-sm font-semibold sm:max-w-none sm:text-base',
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
                aria-controls="sncbt-student-dashboard-sidebar-student-main-navigation"
              />
            </UTooltip>
            <UTooltip :text="collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'">
              <UDashboardSidebarCollapse
                icon="i-lucide-panel-left"
                color="neutral"
                :variant="collapsed ? 'soft' : 'ghost'"
                square
                :aria-expanded="!collapsed"
                aria-controls="sncbt-student-dashboard-sidebar-student-main-navigation"
              />
            </UTooltip>
          </template>

          <template #right>
            <UBadge
              label="Student"
              color="primary"
              variant="soft"
              icon="i-lucide-graduation-cap"
              class="hidden sm:inline-flex"
            />
            <UColorModeButton color="neutral" variant="ghost" />
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
        <main class="min-h-[calc(100dvh-var(--ui-header-height))] bg-muted/40 text-default transition-colors dark:bg-default">
          <div class="mx-auto w-full max-w-[1500px]">
            <slot />
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
          <h2 class="text-xl font-bold text-highlighted">Sign out of the Student Portal?</h2>
          <p class="mt-2 text-sm leading-relaxed text-muted">
            This Student Portal session will be closed. You will need to authenticate again to access your Library records.
          </p>
        </div>
        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            block
            :disabled="loggingOut"
            @click="logoutOpen = false"
          />
          <UButton
            label="Sign Out"
            icon="i-lucide-log-out"
            color="error"
            block
            :loading="loggingOut"
            @click="signOut"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
