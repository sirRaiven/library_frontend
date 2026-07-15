<script setup>
definePageMeta({
  layout: "librarian",
  title: "Books Catalog",
});

// Mock data representing the aggregation of Book + Book Copies
const books = ref([
  {
    id: 1,
    title: "Clean Code: A Handbook of Agile Software Craftsmanship",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    category: "Computer Science",
    totalCopies: 5,
    availableCopies: 3,
  },
  {
    id: 2,
    title: "JavaScript: The Definitive Guide",
    author: "David Flanagan",
    isbn: "978-1491952023",
    category: "Programming",
    totalCopies: 2,
    availableCopies: 0,
  },
]);

const columns = [
  { id: "title", key: "title", label: "Title & Author" },
  { id: "isbn", key: "isbn", label: "ISBN" },
  { id: "category", key: "category", label: "Category" },
  { id: "inventory", key: "inventory", label: "Physical Copies" },
  { id: "actions", key: "actions", label: "Actions" },
];
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <h2
          class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
        >
          Library Catalog
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage book titles and track individual physical barcodes.
        </p>
      </div>
      <div class="flex gap-3">
        <UInput
        class="hover:shadow-md hover:shadow-emerald-500/10 transition-all duration-300 ease-out"
          icon="i-lucide-search"
          placeholder="Search title or ISBN..."
          color="white"
        />
        <UButton color="emerald" icon="i-lucide-plus" class="w-full md:w-auto text-slate-900 font-bold border border-emerald-100 hover:bg-emerald-100 hover:text-emerald-400 transition-colors">
          Add New Title
        </UButton>
      </div>
    </div>

    <div
      class="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-emerald-100 dark:border-emerald-200"
    >
      <UTable :rows="books" :columns="columns">
        <template #title-data="{ row }">
          <div class="font-medium text-slate-900 dark:text-white">
            {{ row.title }}
          </div>
          <div class="text-xs text-slate-500">{{ row.author }}</div>
        </template>

        <template #inventory-data="{ row }">
          <div class="flex items-center gap-2">
            <span
              class="text-sm font-bold"
              :class="
                row.availableCopies > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-500'
              "
            >
              {{ row.availableCopies }} available
            </span>
            <span class="text-xs text-slate-400"
              >/ {{ row.totalCopies }} total</span
            >
          </div>
        </template>

        <template #actions-data="{ row }">
          <div class="flex justify-end">
            <UButton color="gray" variant="ghost" icon="i-lucide-barcode"
              >Manage Copies</UButton
            >
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
