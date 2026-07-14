<script setup>
definePageMeta({
  layout: "librarian",
  title: "Faculty",
});

// Mock Database: Faculty
const faculty = ref([
  {
    id: 1,
    employee_id: "EMP-00045",
    barcode: "EMP00045",
    firstname: "Jarhen",
    lastname: "Maniego",
    department: "College of Computer Studies",
    status: "Active",
  },
]);

const columns = [
  { id: "faculty", key: "faculty", label: "Faculty Name & Dept" },
  { id: "barcode", key: "barcode", label: "Employee Barcode" },
  { id: "status", key: "status", label: "Status" },
  { id: "actions", key: "actions", label: "Actions" },
];
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <!-- Header Controls -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <h2
          class="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight"
        >
          Faculty Directory
        </h2>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Register faculty using their existing employee ID barcode.
        </p>
      </div>
      <div class="flex gap-3">
        <UInput
          icon="i-lucide-search"
          placeholder="Search by name or ID..."
          color="white"
        />
        <UButton color="emerald" icon="i-lucide-user-plus"
          >Register Faculty</UButton
        >
      </div>
    </div>

    <!-- Data Table -->
    <div
      class="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-hidden transition-colors"
    >
      <UTable
        :rows="faculty"
        :columns="columns"
        :ui="{ td: { base: 'align-middle py-4' } }"
      >
        <!-- Faculty Info Column -->
        <template #faculty-data="{ row }">
          <div class="flex items-center gap-3">
            <UAvatar
              :alt="row.firstname"
              size="md"
              class="ring-1 ring-neutral-200 dark:ring-neutral-700"
            />
            <div>
              <div class="font-bold text-neutral-900 dark:text-white">
                {{ row.firstname }} {{ row.lastname }}
              </div>
              <div class="text-xs text-neutral-500">{{ row.department }}</div>
            </div>
          </div>
        </template>

        <!-- Barcode Column -->
        <template #barcode-data="{ row }">
          <div>
            <div
              class="font-mono text-sm font-semibold text-neutral-700 dark:text-neutral-300"
            >
              {{ row.barcode }}
            </div>
            <div
              class="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5"
            >
              Emp ID: {{ row.employee_id }}
            </div>
          </div>
        </template>

        <!-- Status Column -->
        <template #status-data="{ row }">
          <UBadge
            :color="row.status === 'Active' ? 'emerald' : 'gray'"
            variant="subtle"
            class="font-bold"
          >
            {{ row.status }}
          </UBadge>
        </template>

        <!-- Actions Column -->
        <template #actions-data="{ row }">
          <div class="flex justify-end">
            <UButton
              color="gray"
              variant="ghost"
              icon="i-lucide-more-vertical"
            />
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>
