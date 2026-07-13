<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { isSidebarOpen, toggleSidebar } = useLayoutState();
const route = useRoute();
const colorMode = useColorMode();

const navItems: NavigationMenuItem[] = [
  {
    label: "Dashboard",
    icon: "i-lucide-layout-dashboard",
    to: "/librarian/dashboard",
  },
  {
    label: "Book Catalog",
    icon: "i-lucide-book-open",
    to: "/librarian/catalog",
  },
  {
    label: "Circulation",
    icon: "i-lucide-arrow-left-right",
    to: "/librarian/circulation",
  },
  { label: "Patron Records", icon: "i-lucide-users", to: "/librarian/patrons" },
];
</script>

<template>
  <!-- Main layout background flips based on theme -->
  <div
    class="flex h-screen w-full bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200"
  >
    <!-- Sidebar -->
    <!-- 1. Removed hardcoded bg-slate-900. Added dark:bg-neutral-900 -->
    <!-- 2. Added border-neutral-200/dark:border-neutral-800 for the border -->
    <USidebar
      v-model:open="isSidebarOpen"
      collapsible="icon"
      side="left"
      class="bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 z-50"
      :ui="{ container: 'h-full flex flex-col justify-between p-4' }"
    >
      <template #header>
        <div class="flex items-center gap-3 px-1 h-10 overflow-hidden">
          <div
            class="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center text-white font-bold shrink-0"
          >
            <UIcon name="i-lucide-book" class="w-5 h-5" />
          </div>
          <!-- Using group-data attribute for smooth hiding -->
          <div class="group-data-[collapsible=icon]:hidden whitespace-nowrap">
            <span
              class="block font-semibold text-sm leading-tight text-neutral-900 dark:text-white"
              >Library System</span
            >
            <span
              class="block text-[10px] text-neutral-500 dark:text-neutral-400"
              >Dynamic Management</span
            >
          </div>
        </div>
      </template>

      <UNavigationMenu
        :items="navItems"
        orientation="vertical"
        :ui="{
          root: 'w-full',
          link: 'p-2.5 my-0.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors font-medium text-sm',
          linkLeadingIcon: 'w-5 h-5 shrink-0',
        }"
      />

      <template #footer>
        <div
          class="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3 flex items-center w-full overflow-hidden"
        >
          <div
            class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0"
          >
            <UIcon name="i-lucide-user" class="w-4 h-4" />
          </div>
          <div
            class="ml-3 group-data-[collapsible=icon]:hidden whitespace-nowrap"
          >
            <span
              class="block text-sm font-medium text-neutral-900 dark:text-white truncate"
              >librarian_01</span
            >
            <span
              class="block text-[10px] text-neutral-500 dark:text-neutral-400 truncate"
              >Head Librarian</span
            >
          </div>
        </div>
      </template>
    </USidebar>

    <!-- Main Viewport -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header background and borders now adapt to theme -->
      <header
        class="h-16 shrink-0 flex items-center justify-between px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 transition-colors"
      >
        <div class="flex items-center gap-4">
          <UButton
            icon="i-lucide-panel-left"
            color="neutral"
            variant="ghost"
            @click="toggleSidebar"
            class="text-neutral-600 dark:text-neutral-400"
          />
          <h2
            class="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider truncate"
          >
            {{ route.meta.title || "Library Management System" }}
          </h2>
        </div>

        <div class="flex items-center gap-3">
          <UButton
            :icon="
              colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'
            "
            color="neutral"
            variant="ghost"
            square
            @click="
              () => {
                colorMode.preference =
                  colorMode.value === 'dark' ? 'light' : 'dark';
              }
            "
          />
        </div>
      </header>

      <div class="flex-1 p-8 overflow-y-auto">
        <slot />
      </div>
    </div>
  </div>
</template>
