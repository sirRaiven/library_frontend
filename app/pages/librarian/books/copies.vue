<template>
  <UContainer class="py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold">Physical Copies Directory</h1>
      <p class="text-gray-500">
        Manage and audit individual physical inventory assets
      </p>
    </div>

    <!-- Controls -->
    <UCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search inventory..."
          class="md:col-span-2"
        />
        <USelect
          v-model="statusFilter"
          :options="[
            'All Statuses',
            'Available',
            'Borrowed',
            'Lost',
            'Damaged',
          ]"
        />
        <UButton
          color="primary"
          icon="i-heroicons-printer"
          block
          :disabled="selected.length === 0"
          @click="printSelected"
        >
          Print Selected ({{ selected.length }})
        </UButton>
      </div>
    </UCard>

    <!-- Data Table -->
    <UCard :ui="{ body: { padding: '' } }">
      <UTable v-model="selected" :columns="columns" :rows="filteredCopies">
        <!-- Status Badge Customization -->
        <template #status-data="{ row }">
          <UBadge :color="getStatusColor(row.status)" variant="subtle">
            {{ row.status }}
          </UBadge>
        </template>

        <!-- Actions Customization -->
        <template #actions-data="{ row }">
          <div class="flex items-center justify-end gap-2">
            <UButton
              icon="i-heroicons-eye"
              variant="ghost"
              color="gray"
              :to="`/librarian/books/${row.bookId}`"
            />
            <UButton
              icon="i-heroicons-printer"
              variant="ghost"
              color="gray"
              @click="printSingle(row.controlNumber)"
            />
          </div>
        </template>
      </UTable>
    </UCard>
  </UContainer>
</template>

<script setup>
import { ref, computed } from "vue";

const search = ref("");
const statusFilter = ref("All Statuses");
const selected = ref([]);

// Nuxt UI requires a 'columns' array mapping 'key' to data
const columns = [
  { key: "controlNumber", label: "Control Number", sortable: true },
  { key: "bookTitle", label: "Title", sortable: true },
  { key: "author", label: "Author" },
  { key: "shelf", label: "Shelf Location" },
  { key: "status", label: "Status" },
  { key: "actions", label: "" },
];

const physicalCopiesList = ref([
  {
    controlNumber: "LIB-2026-004812",
    bookId: "1",
    bookTitle: "Systems Analysis and Design",
    author: "Kenneth Kendall",
    shelf: "Row B-3",
    status: "Available",
  },
  {
    controlNumber: "LIB-2026-004813",
    bookId: "1",
    bookTitle: "Systems Analysis and Design",
    author: "Kenneth Kendall",
    shelf: "Row B-3",
    status: "Borrowed",
  },
  {
    controlNumber: "LIB-2026-118239",
    bookId: "2",
    bookTitle: "Introduction to Arduino Automation",
    author: "Jane Doe",
    shelf: "Lab Room 2",
    status: "Available",
  },
]);

const filteredCopies = computed(() => {
  let data = physicalCopiesList.value;
  if (statusFilter.value !== "All Statuses") {
    data = data.filter((copy) => copy.status === statusFilter.value);
  }
  if (search.value) {
    const lowerSearch = search.value.toLowerCase();
    data = data.filter(
      (c) =>
        c.bookTitle.toLowerCase().includes(lowerSearch) ||
        c.controlNumber.toLowerCase().includes(lowerSearch),
    );
  }
  return data;
});

const getStatusColor = (status) => {
  const map = {
    Available: "green",
    Borrowed: "blue",
    Lost: "red",
    Damaged: "orange",
  };
  return map[status] || "gray";
};

const printSingle = (controlNumber) => {
  navigateTo({
    path: "/librarian/books/print",
    query: { barcodes: controlNumber },
  });
};

const printSelected = () => {
  if (selected.value.length === 0) return;
  navigateTo({
    path: "/librarian/books/print",
    query: { barcodes: selected.value.join(",") },
  });
};
</script>
