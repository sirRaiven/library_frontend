<script setup lang="ts">
import type {
  DropdownMenuItem,
  NavigationMenuItem,
} from "@nuxt/ui";

interface StrapiPaginationResponse {
  meta?: {
    pagination?: {
      total?: number;
    };
  };
}

const route = useRoute();
const auth = useAuth();
const toast = useToast();

const sidebarOpen = ref(false);
const sidebarCollapsed = ref(false);
const isLogoutModalOpen = ref(false);
const isLoggingOut = ref(false);
const globalSearch = ref("");
const unreadNotifications = ref(0);

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
      title: "Dashboard",
      icon: "i-lucide-layout-dashboard",
    };
  }

  if (path.startsWith("/librarian/books")) {
    return {
      title: "Library Collection",
      icon: "i-lucide-books",
    };
  }

  if (path.startsWith("/librarian/borrow")) {
    return {
      title: "Borrow Books",
      icon: "i-lucide-book-up",
    };
  }

  if (path.startsWith("/librarian/return")) {
    return {
      title: "Return Books",
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

  if (path.startsWith("/librarian/faculty")) {
    return {
      title: "Faculty",
      icon: "i-lucide-briefcase-business",
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

const navigationItems =
  computed<NavigationMenuItem[][]>(() => [
    [
      {
        label: "Dashboard",
        icon: "i-lucide-layout-dashboard",
        to: "/librarian/dashboard",
        active: isRouteActive(
          "/librarian/dashboard",
          true,
        ),
      },
    ],
    [
      {
        label: "Library Collection",
        type: "label",
      },
      {
        label: "Books",
        icon: "i-lucide-books",
        to: "/librarian/books",
        active: isBooksCatalogActive(),
      },
      {
        label: "Register Book",
        icon: "i-lucide-book-plus",
        to: "/librarian/books/register",
        active: isRouteActive(
          "/librarian/books/register",
        ),
      },
      {
        label: "Import Inventory",
        icon: "i-lucide-file-up",
        to: "/librarian/books/import",
        active: isRouteActive(
          "/librarian/books/import",
        ),
      },
      {
        label: "Physical Copies",
        icon: "i-lucide-copy",
        to: "/librarian/books/copies",
        active: isRouteActive(
          "/librarian/books/copies",
        ),
      },
    ],
    [
      {
        label: "Library Services",
        type: "label",
      },
      {
        label: "Borrow Books",
        icon: "i-lucide-book-up",
        to: "/librarian/borrow",
        active: isRouteActive(
          "/librarian/borrow",
        ),
      },
      {
        label: "Return Books",
        icon: "i-lucide-book-down",
        to: "/librarian/return",
        active: isRouteActive(
          "/librarian/return",
        ),
      },
      {
        label: "Reservations",
        icon: "i-lucide-calendar-check-2",
        to: "/librarian/reservations",
        active: isRouteActive(
          "/librarian/reservations",
        ),
      },
    ],
    [
      {
        label: "Library Members",
        type: "label",
      },
      {
        label: "Students",
        icon: "i-lucide-graduation-cap",
        to: "/librarian/students",
        active: isRouteActive(
          "/librarian/students",
        ),
      },
      {
        label: "Faculty",
        icon: "i-lucide-briefcase-business",
        to: "/librarian/faculty",
        active: isRouteActive(
          "/librarian/faculty",
        ),
      },
      {
        label: "Library Cards",
        icon: "i-lucide-id-card",
        to: "/librarian/memberships",
        active: isRouteActive(
          "/librarian/memberships",
        ),
      },
    ],
    [
      {
        label: "Reports & Monitoring",
        type: "label",
      },
      {
        label: "Reports",
        icon:
          "i-lucide-chart-no-axes-combined",
        to: "/librarian/reports",
        active: isRouteActive(
          "/librarian/reports",
        ),
      },
      {
        label: "Notifications",
        icon: "i-lucide-bell",
        to: "/librarian/notifications",
        active: isRouteActive(
          "/librarian/notifications",
        ),
        badge:
          unreadNotifications.value > 0
            ? String(
                Math.min(
                  unreadNotifications.value,
                  99,
                ),
              )
            : undefined,
      },
    ],
  ]);

const accountMenuItems =
  computed<DropdownMenuItem[][]>(() => [
    [
      {
        label: userName.value,
        type: "label",
      },
      {
        label: "Dashboard",
        icon: "i-lucide-layout-dashboard",
        to: "/librarian/dashboard",
      },
      {
        label: "Notifications",
        icon: "i-lucide-bell",
        to: "/librarian/notifications",
        badge:
          unreadNotifications.value > 0
            ? String(
                Math.min(
                  unreadNotifications.value,
                  99,
                ),
              )
            : undefined,
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

async function loadUnreadNotifications() {
  try {
    const response =
      await auth.authFetch<StrapiPaginationResponse>(
        "/api/notifications",
        {
          method: "GET",
          query: {
            "filters[is_read][$eq]": false,
            "pagination[page]": 1,
            "pagination[pageSize]": 1,
          },
        },
      );

    unreadNotifications.value =
      response.meta?.pagination?.total ?? 0;
  } catch {
    unreadNotifications.value = 0;
  }
}

async function handleLogout() {
  if (isLoggingOut.value) {
    return;
  }

  isLoggingOut.value = true;

  try {
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

onMounted(() => {
  void loadUnreadNotifications();
});

watch(
  () => route.fullPath,
  () => {
    // Close the mobile sidebar after navigation.
    sidebarOpen.value = false;

    if (
      route.path.startsWith(
        "/librarian/notifications",
      )
    ) {
      void loadUnreadNotifications();
    }
  },
);
</script>

<template>
  <UDashboardGroup
    storage="local"
    storage-key="sncbt-librarian-dashboard"
    class="min-h-dvh bg-default text-default"
  >
    <UDashboardSidebar
      v-model:open="sidebarOpen"
      v-model:collapsed="sidebarCollapsed"
      collapsible
      resizable
      :min-size="16"
      :default-size="20"
      :max-size="26"
      mode="slideover"
      :ui="{
        root:
          'bg-default border-e border-default transition-colors duration-200',
        header:
          'border-b border-default bg-default/95 backdrop-blur',
        body: 'gap-3 py-4',
        footer:
          'border-t border-default bg-default/95 py-3 backdrop-blur',
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/librarian/dashboard"
          class="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none ring-primary focus-visible:ring-2"
          aria-label="Open librarian dashboard"
        >
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success text-white shadow-sm shadow-success/25"
          >
            <UIcon
              name="i-lucide-library-big"
              class="size-5"
            />
          </div>

          <div
            v-if="!collapsed"
            class="min-w-0 flex-1"
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
        <UTooltip
          :text="
            collapsed
              ? 'Expand sidebar'
              : 'Collapse sidebar'
          "
          :disabled="!collapsed"
        >
          <UButton
            :label="
              collapsed
                ? undefined
                : 'Collapse sidebar'
            "
            :icon="
              collapsed
                ? 'i-lucide-panel-left-open'
                : 'i-lucide-panel-left-close'
            "
            color="neutral"
            variant="soft"
            block
            :square="collapsed"
            :aria-label="
              collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            "
            class="shrink-0 justify-center"
            @click="
              sidebarCollapsed =
                !sidebarCollapsed
            "
          />
        </UTooltip>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="navigationItems"
          orientation="vertical"
          tooltip
          popover
          highlight
          color="success"
          variant="pill"
          class="min-h-0 flex-1 overflow-y-auto"
          :ui="{
            link: 'rounded-xl',
            linkLeadingIcon: 'size-5',
            linkLabel: 'font-medium',
          }"
        />

        <div
          v-if="!collapsed"
          class="mt-auto rounded-xl border border-success/20 bg-success/5 p-3"
        >
          <div class="flex items-start gap-3">
            <div
              class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success"
            >
              <UIcon
                name="i-lucide-shield-check"
                class="size-4"
              />
            </div>

            <div class="min-w-0">
              <p
                class="text-xs font-semibold text-highlighted"
              >
                Secure librarian access
              </p>
              <p
                class="mt-0.5 text-xs leading-relaxed text-muted"
              >
                Protected by Strapi authentication
                and role permissions.
              </p>
            </div>
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
            class="w-full"
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
              v-if="!collapsed"
              class="min-w-0 flex-1 text-left"
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
              v-if="!collapsed"
              name="i-lucide-chevrons-up-down"
              class="size-4 shrink-0 text-dimmed"
            />
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel
      id="librarian-main"
      :ui="{
        root: 'bg-default',
        body: 'p-0 sm:p-0',
      }"
    >
      <template #header>
        <UDashboardNavbar
          :title="pageTitle"
          :icon="pageIcon"
          toggle-side="left"
          :toggle="{
            color: 'neutral',
            variant: 'ghost',
            icon: 'i-lucide-menu',
          }"
          :ui="{
            root:
              'border-b border-default bg-default/90 backdrop-blur transition-colors duration-200',
          }"
        >
          <template #right>
            <form
              class="hidden w-72 lg:block"
              @submit.prevent="submitGlobalSearch"
            >
              <UInput
                v-model="globalSearch"
                icon="i-lucide-search"
                placeholder="Search the book collection"
                autocomplete="off"
                class="w-full"
              />
            </form>

            <div class="relative">
              <UButton
                to="/librarian/notifications"
                icon="i-lucide-bell"
                color="neutral"
                variant="ghost"
                square
                aria-label="Open notifications"
              />

              <span
                v-if="unreadNotifications > 0"
                class="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-4 text-white"
              >
                {{
                  unreadNotifications > 99
                    ? "99+"
                    : unreadNotifications
                }}
              </span>
            </div>

            <UColorModeButton
              color="neutral"
              variant="ghost"
            />

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
          class="min-h-[calc(100dvh-var(--ui-header-height))] bg-muted/40 text-default transition-colors duration-200 dark:bg-default"
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
            label="Cancel"
            color="neutral"
            variant="outline"
            size="lg"
            block
            :disabled="isLoggingOut"
            @click="
              isLogoutModalOpen = false
            "
          />

          <UButton
            label="Sign Out"
            icon="i-lucide-log-out"
            color="error"
            size="lg"
            block
            :loading="isLoggingOut"
            @click="handleLogout"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
