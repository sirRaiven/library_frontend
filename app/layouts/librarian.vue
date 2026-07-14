<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const open = ref(true);

const route = useRoute();
const colorMode = useColorMode();

const navItems: NavigationMenuItem[] = [
  {
    label: "Dashboard",
    icon: "i-lucide-layout-dashboard",
    to: "/librarian/dashboard",
  },
  {
    label: "Books",
    icon: "i-lucide-book-open",
    to: "/librarian/books",
  },
  {
    label: "Borrowing",
    icon: "i-lucide-book-up",
    to: "/librarian/borrowing",
  },
  {
    label: "Returning",
    icon: "i-lucide-book-down",
    to: "/librarian/returning",
  },
  {
    label: "Reservations",
    icon: "i-lucide-calendar-check-2",
    to: "/librarian/reservations",
  },
  {
    label: "Reports",
    icon: "i-lucide-chart-column",
    to: "/librarian/reports",
  },
  {
    label: "Notifications",
    icon: "i-lucide-bell",
    to: "/librarian/notifications",
  },
];
</script>

<template>
  <div class="flex h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors">

    <!-- Added `class="group"` so children can react to the collapsed state -->
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

          <!-- Optimized: Replaced laggy width transitions with instant hide -->
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
          linkLabel: 'truncate group-data-[collapsible=icon]:hidden'
        }"
      />

      <!-- Footer -->
      <template #footer>
        <div class="flex items-center gap-3 rounded-xl bg-neutral-100 p-2.5 dark:bg-neutral-800">
          <UAvatar
            alt="Librarian"
            class="shrink-0"
          />

          <!-- Optimized: Replaced laggy width transitions with instant hide -->
          <div class="group-data-[collapsible=icon]:hidden whitespace-nowrap">
            <p class="text-sm font-semibold text-neutral-900 dark:text-white">
              librarian_01
            </p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              Head Librarian
            </p>
          </div>
        </div>
      </template>
    </USidebar>

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