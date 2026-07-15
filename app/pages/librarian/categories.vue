<script setup>
definePageMeta({
  layout: "librarian",
  title: "Categories",
});

// Mock Database: Categories
const categories = ref([
  {
    id: 1,
    name: "Embedded Systems & IoT",
    description:
      "Resources on microcontrollers, Arduino projects, and hardware automation.",
    bookCount: 142,
    status: "Active",
  },
  {
    id: 2,
    name: "Web Development",
    description:
      "Modern JavaScript frameworks, Nuxt, Vue, and headless CMS integrations.",
    bookCount: 210,
    status: "Active",
  },
  {
    id: 3,
    name: "Animation & Multimedia",
    description:
      "Traditional drawing requirements and digital in-betweening software guides.",
    bookCount: 89,
    status: "Active",
  },
  {
    id: 4,
    name: "Network Administration",
    description:
      "Routing, switching, and network management synthesis research.",
    bookCount: 115,
    status: "Active",
  },
]);

// Updated to match Nuxt UI v3 / TanStack Table specifications
const columns = [
  {
    id: "name",
    accessorKey: "name",
    header: "Category",
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Description",
  },
  {
    id: "bookCount",
    accessorKey: "bookCount",
    header: "Total Books",
  },
  {
    id: "actions",
    header: "Actions",
  },
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
          Subject Categories
        </h2>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Organize and manage the library's classification system.
        </p>
      </div>
      <div class="flex gap-3">
        <UInput
          icon="i-lucide-search"
          placeholder="Search categories..."
          color="white"
          class="hover:shadow-md hover:shadow-emerald-500/10 transition-all duration-300 ease-out"
        />
        <UButton color="emerald" icon="i-lucide-folder-plus" class="w-full md:w-auto text-slate-900 font-bold border border-emerald-100 hover:bg-emerald-100 hover:text-emerald-400 transition-colors">New Category</UButton
        >
      </div>
    </div>

    <!-- Data Table -->
    <div
      class="bg-white dark:bg-neutral-900 rounded-2xl shadow-md border border-emerald-100 dark:border-emerald-200 overflow-hidden transition-colors"
    >
      <UTable
        :rows="categories"
        :columns="columns"
        :ui="{ td: { base: 'align-middle py-4' } }"
      >
        <!-- Nuxt UI v3 uses slot-cell instead of slot-data -->
        <template #name-cell="{ row }">
          <div class="font-bold text-neutral-900 dark:text-white">
            {{ row.name }}
          </div>
        </template>

        <template #description-cell="{ row }">
          <div class="text-sm text-neutral-500 truncate max-w-md">
            {{ row.description }}
          </div>
        </template>

        <template #bookCount-cell="{ row }">
          <UBadge color="gray" variant="subtle" class="font-medium">
            {{ row.bookCount }} items
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-2">
            <UTooltip text="Edit Category">
              <UButton
                color="gray"
                variant="ghost"
                icon="i-lucide-pencil"
                size="xs"
              />
            </UTooltip>
            <UTooltip text="Delete">
              <UButton
                color="red"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="xs"
              />
            </UTooltip>
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>
