<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const open = ref(true);
const isLogoutModalOpen = ref(false); // Modal state
const username = ref('librarian_01'); // Temporary username

const route = useRoute();
const colorMode = useColorMode();
const router = useRouter();
const roleCookie = useCookie('user-role');

const handleLogout = () => {
  roleCookie.value = null; // Clear auth
  isLogoutModalOpen.value = false;
  router.push('/'); // Redirect to login
};

const navItems: NavigationMenuItem[][] = [
  [
    {
      label: "Dashboard",
      icon: "i-lucide-layout-dashboard",
      to: "/librarian/dashboard"
    }
  ],
  [
    {
      label: "Library",
      type: "label"
    },
    {
      label: "Books",
      icon: "i-lucide-book-open",
      to: "/librarian/books"
    },
    {
      label: "Categories",
      icon: "i-lucide-folder-open",
      to: "/librarian/categories"
    }
  ],
  [
    {
      label: "Circulation",
      type: "label"
    },
    {
      label: "Borrow Books",
      icon: "i-lucide-book-up",
      to: "/librarian/borrow"
    },
    {
      label: "Return Books",
      icon: "i-lucide-book-down",
      to: "/librarian/return"
    },
    {
      label: "Reservations",
      icon: "i-lucide-calendar-check",
      to: "/librarian/reservations"
    }
  ],
  [
    {
      label: "People",
      type: "label"
    },
    {
      label: "Students",
      icon: "i-lucide-graduation-cap",
      to: "/librarian/students"
    },
    {
      label: "Faculty",
      icon: "i-lucide-briefcase",
      to: "/librarian/faculty"
    }
  ],
  [
    {
      label: "Monitoring",
      type: "label"
    },
    {
      label: "Reports",
      icon: "i-lucide-chart-column",
      to: "/librarian/reports"
    },
    {
      label: "Notifications",
      icon: "i-lucide-bell",
      to: "/librarian/notifications"
    }
  ]
]
</script>

<template>
  <div class="flex h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors">

    <USidebar
      v-model:open="open"
      collapsible="icon"
      side="left"
      class="group border-r border-neutral-200 dark:border-neutral-800"
      :ui="{
        container: 'h-full flex flex-col justify-between p-0'
      }"
    >
      <!-- Header -->
      <template #header>
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white"
          >
            <UIcon
              name="i-lucide-library-big"
              class="size-5 shrink-0"
            />
          </div>

          <div class="group-data-[collapsible=icon]:hidden whitespace-nowrap">
            <h1 class="text-sm font-bold text-neutral-900 dark:text-white">
              SNCBT Library
            </h1>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              Management System
            </p>
          </div>
        </div>
      </template>

      <!-- Navigation -->
      <UNavigationMenu
        :items="navItems"
        orientation="vertical"
        :ui="{
          root: 'w-full',
          link: 'my-1 rounded-xl px-2.5 py-2.5 font-medium transition-colors',
          linkLeadingIcon: 'size-6',
          linkLabel: 'truncate group-data-[collapsible=icon]:hidden transition-all',
        }"
      />

      <!-- Footer -->
      <template #footer>
        <div class="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800/60 flex flex-col gap-3 transition-all">
          
          <!-- User Profile -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 cursor-pointer" @click="open ? null : (isLogoutModalOpen = true)">
              <UIcon name="i-lucide-user" class="w-5 h-5" />
            </div>
            
            <div class="group-data-[collapsible=icon]:hidden whitespace-nowrap">
              <p class="text-sm font-bold text-neutral-900 dark:text-white">
                {{ username }}
              </p>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                Head Librarian
              </p>
            </div>
          </div>

          <!-- Sign Out Button -->
          <UButton
            label="Logout"
            icon="i-lucide-log-out"
            color="error"
            variant="soft"
            block
            class="group-data-[collapsible=icon]:hidden justify-center font-medium"
            @click="() => {isLogoutModalOpen = true}"
          />
        </div>
      </template>
    </USidebar>

    <!-- Logout Modal with #content slot -->
    <UModal v-model:open="isLogoutModalOpen" :ui="{ content: 'sm:max-w-md' }">
      <template #content>
        <div class="p-8 flex flex-col items-center text-center">
          
          <!-- Large Floating Red Icon -->
          <div class="w-16 h-16 rounded-2xl bg-error text-white flex items-center justify-center shadow-xl shadow-error/30 mb-5 mt-2">
            <UIcon name="i-lucide-log-out" class="w-8 h-8" />
          </div>

          <!-- Typography -->
          <h3 class="text-xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">Logout Session?</h3>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            You are about to sign out from the <span class="font-bold text-neutral-900 dark:text-white">SNCBT Library</span>.<br>
            You can login again anytime.
          </p>

          <!-- Embedded Profile Card -->
          <div class="w-full flex items-center gap-3 p-4 mt-6 rounded-xl border border-emerald-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-left">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-user" class="w-5 h-5" />
            </div>
            <div>
              <p class="text-sm font-bold text-neutral-900 dark:text-white">
                {{ username }}
              </p>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                Head Librarian
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 w-full mt-6">
            <UButton
              label="Logout"
              variant="soft"
              icon="i-lucide-log-out"
              color="error"
              size="lg"
              block
              class="flex-1 justify-center font-semibold"
              @click="handleLogout"
            />
            <UButton
              label="Stay Logged In"
              color="error"
              size="lg"
              block
              class="flex-1 justify-center font-semibold shadow-md shadow-red-500/20"
              @click="() => { isLogoutModalOpen = false }"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Content Wrapper -->
    <div
      class="
        flex-1
        flex
        flex-col
        min-w-0
        overflow-hidden
        lg:peer-data-[variant=inset]:my-4
        lg:peer-data-[variant=inset]:mr-4
        peer-data-[variant=inset]:rounded-2xl
        peer-data-[variant=inset]:shadow-sm
        peer-data-[variant=inset]:ring
        peer-data-[variant=inset]:ring-neutral-200
        dark:peer-data-[variant=inset]:ring-neutral-800
        bg-white dark:bg-neutral-900
        transition-colors
      "
    >
      <!-- Topbar -->
      <header
        class="flex h-16 shrink-0 items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 transition-colors"
      >
        <div class="flex items-center gap-4">
          <UButton
            :icon="open ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
            color="neutral"
            variant="ghost"
            @click="() => { open = !open }"
            class="text-neutral-500 dark:text-neutral-400"
          />

          <div>
            <h2 class="text-lg font-semibold text-neutral-900 dark:text-white truncate tracking-tight">
              {{ route.meta.title || "Dashboard" }}
            </h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              Library Management System
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <UInput
            icon="i-lucide-search"
            placeholder="Search..."
            class="w-72 hidden md:block"
            :ui="{ base: 'bg-neutral-50 dark:bg-neutral-950' }"
          />

          <UButton
            icon="i-lucide-bell"
            color="neutral"
            variant="ghost"
            class="text-neutral-500 dark:text-neutral-400"
          />

          <UButton
            :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
            color="neutral"
            variant="ghost"
            @click="() => { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }"
            class="text-neutral-500 dark:text-neutral-400"
          />

          <UAvatar alt="Librarian" size="sm" class="ml-2 ring-2 ring-neutral-100 dark:ring-neutral-800" />
        </div>
      </header>

      <!-- Main Page Slot -->
      <main class="flex-1 overflow-auto p-8 bg-white dark:bg-neutral-900 transition-colors">
        <slot />
      </main>
    </div>
  </div>
</template>