<script setup>
definePageMeta({
  layout: "librarian",
  title: "Reservations",
});

const reservations = ref([
  {
    queue_number: "Q-104",
    student: "Catherine Joy Calma",
    barcode: "STU202600125",
    book: "Clean Code",
    date: "Jul 15, 2026",
    status: "Awaiting Pickup",
  },
  {
    queue_number: "Q-105",
    student: "Metchelyn Samson",
    barcode: "STU202509841",
    book: "Nuxt 3 Fundamentals",
    date: "Jul 15, 2026",
    status: "In Queue",
  },
]);

const columns = [
  { id: "queue", key: "queue", label: "Queue No." },
  { id: "borrower", key: "borrower", label: "Borrower" },
  { id: "book", key: "book", label: "Requested Book" },
  { id: "date", key: "date", label: "Date Requested" },
  { id: "status", key: "status", label: "Status" },
  { id: "actions", key: "actions", label: "Actions" },
];
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Top Action Area for New Reservations -->
    <div
      class="bg-emerald-500 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative"
    >
      <!-- Decorative Background Icon -->
      <UIcon
        name="i-lucide-calendar-clock"
        class="absolute -right-4 -bottom-4 w-48 h-48 text-emerald-600/20"
      />

      <div class="relative z-10 text-white space-y-2">
        <h3 class="text-xl font-bold">Create New Reservation</h3>
        <p class="text-emerald-50 text-sm max-w-md">
          Scan a student or faculty ID, then search the catalog to place a hold
          on an unavailable book.
        </p>
      </div>

      <div class="relative z-10 w-full md:w-auto">
        <UButton
          color="white"
          variant="solid"
          size="lg"
          icon="i-lucide-plus"
          class="w-full md:w-auto text-emerald-600 font-bold"
        >
          Start Reservation Workflow
        </UButton>
      </div>
    </div>

    <!-- Active Reservations Ledger -->
    <div
      class="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-hidden transition-colors"
    >
      <div
        class="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center"
      >
        <h3 class="font-bold text-neutral-900 dark:text-white">Active Queue</h3>
        <UInput
          icon="i-lucide-search"
          placeholder="Search queue..."
          size="sm"
          class="w-64"
        />
      </div>

      <UTable :rows="reservations" :columns="columns">
        <template #queue-data="{ row }">
          <span
            class="font-bold font-mono text-emerald-600 dark:text-emerald-400"
            >{{ row.queue_number }}</span
          >
        </template>

        <template #borrower-data="{ row }">
          <div>
            <div class="font-medium text-neutral-900 dark:text-white">
              {{ row.student }}
            </div>
            <div class="text-xs text-neutral-500 font-mono">
              {{ row.barcode }}
            </div>
          </div>
        </template>

        <template #status-data="{ row }">
          <UBadge
            :color="row.status === 'Awaiting Pickup' ? 'emerald' : 'orange'"
            variant="subtle"
            class="font-bold"
          >
            {{ row.status }}
          </UBadge>
        </template>

        <template #actions-data="{ row }">
          <div class="flex justify-end gap-2">
            <UButton
              v-if="row.status === 'Awaiting Pickup'"
              color="emerald"
              variant="solid"
              size="xs"
              >Fulfill</UButton
            >
            <UButton color="gray" variant="ghost" icon="i-lucide-x" size="xs" />
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>
