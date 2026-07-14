<script setup>
definePageMeta({
  layout: "librarian",
  title: "Students",
});

// Mock Database: Students
const students = ref([
  {
    id: 1,
    student_number: "2026-00125",
    library_card_number: "LC-88392",
    barcode: "STU202600125",
    firstname: "Catherine Joy",
    lastname: "Calma",
    course: "BS Information Technology",
    status: "Active",
  },
  {
    id: 2,
    student_number: "2025-09841",
    library_card_number: "LC-88393",
    barcode: "STU202509841",
    firstname: "Metchelyn",
    lastname: "Samson",
    course: "BS Computer Science",
    status: "Suspended", // Example of a student with penalties
  },
]);

const columns = [
  { id: "student", key: "student", label: "Student Name & Course" },
  { id: "barcode", key: "barcode", label: "Library Barcode" },
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
          Student Directory
        </h2>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Manage student library accounts and generate barcodes.
        </p>
      </div>
      <div class="flex gap-3">
        <UInput
          icon="i-lucide-search"
          placeholder="Search by name or barcode..."
          color="white"
        />
        <UButton color="emerald" icon="i-lucide-user-plus"
          >Register Student</UButton
        >
      </div>
    </div>

    <!-- Data Table -->
    <div
      class="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-hidden transition-colors"
    >
      <UTable
        :rows="students"
        :columns="columns"
        :ui="{ td: { base: 'align-middle py-4' } }"
      >
        <!-- Student Info Column -->
        <template #student-data="{ row }">
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
              <div class="text-xs text-neutral-500">
                {{ row.student_number }} • {{ row.course }}
              </div>
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
              Card: {{ row.library_card_number }}
            </div>
          </div>
        </template>

        <!-- Status Column -->
        <template #status-data="{ row }">
          <UBadge
            :color="row.status === 'Active' ? 'emerald' : 'red'"
            variant="subtle"
            class="font-bold"
          >
            {{ row.status }}
          </UBadge>
        </template>

        <!-- Actions Column -->
        <template #actions-data="{ row }">
          <div class="flex justify-end gap-2">
            <UTooltip text="Print Library Card">
              <UButton color="gray" variant="ghost" icon="i-lucide-printer" />
            </UTooltip>
            <UTooltip text="Edit Profile">
              <UButton color="gray" variant="ghost" icon="i-lucide-pencil" />
            </UTooltip>
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>
