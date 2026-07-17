<template>
  <UContainer class="py-8">
    <UButton
      variant="ghost"
      icon="i-heroicons-arrow-left"
      class="mb-6"
      to="/librarian/books"
    >
      Back to Library Directory
    </UButton>

    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin text-gray-400 mb-4"
      />
      <p class="text-gray-500">Loading Book Inventory Record...</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Left Column: Master Book Profile Details -->
      <UCard class="md:col-span-1 flex flex-col h-full">
        <div
          class="flex flex-col items-center text-center pb-6 border-b border-gray-100"
        >
          <div
            class="w-32 h-44 bg-gray-100 rounded-lg flex items-center justify-center mb-4 border border-gray-200"
          >
            <UIcon
              name="i-heroicons-book-open"
              class="w-12 h-12 text-gray-400"
            />
          </div>
          <h2 class="text-xl font-black leading-tight">{{ book.title }}</h2>
          <div class="text-gray-500 mt-1">{{ book.author }}</div>
          <UBadge color="primary" class="mt-3">{{ book.category }}</UBadge>
        </div>

        <div class="py-4 space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500 font-medium">ISBN-13:</span>
            <span class="font-semibold">{{ book.isbn || "N/A" }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500 font-medium">Publisher:</span>
            <span class="font-semibold">{{ book.publisher || "N/A" }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500 font-medium">Edition:</span>
            <span class="font-semibold">{{ book.edition || "1st" }}</span>
          </div>
        </div>

        <template #footer>
          <UButton block variant="outline" icon="i-heroicons-pencil"
            >Edit Metadata</UButton
          >
        </template>
      </UCard>

      <!-- Right Column: Associated Copy Inventory Assets -->
      <UCard class="md:col-span-2" :ui="{ body: { padding: '' } }">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold">Physical Copies Owned</h3>
              <p class="text-sm text-gray-500">
                Unique instances registered under this book entry
              </p>
            </div>
            <UButton icon="i-heroicons-plus" @click="addCopyDialog = true"
              >Add Copy</UButton
            >
          </div>
        </template>

        <UTable v-model="selected" :columns="copyColumns" :rows="copies">
          <template #status-data="{ row }">
            <UBadge :color="getStatusColor(row.status)" variant="subtle">{{
              row.status
            }}</UBadge>
          </template>
          <template #actions-data="{ row }">
            <UButton
              icon="i-heroicons-printer"
              variant="ghost"
              color="gray"
              @click="printSelectedCopies([row.controlNumber])"
            />
          </template>
        </UTable>

        <template #footer>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-600"
              >Selected ({{ selected.length }}) Items</span
            >
            <UButton
              icon="i-heroicons-printer"
              :disabled="selected.length === 0"
              @click="printSelectedCopies(selected.map((s) => s.controlNumber))"
            >
              Print Selected Labels
            </UButton>
          </div>
        </template>
      </UCard>
    </div>

    <!-- Nuxt UI Modal for Adding a Copy -->
    <UModal v-model="addCopyDialog">
      <UCard>
        <template #header>
          <h3 class="font-bold text-lg">Add Copy Instance</h3>
        </template>

        <UFormGroup label="Shelf Location" class="mb-4">
          <UInput v-model="newCopyShelf" placeholder="e.g., Row A-2" />
        </UFormGroup>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" color="gray" @click="addCopyDialog = false"
              >Cancel</UButton
            >
            <UButton @click="saveNewCopy">Register Copy</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </UContainer>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const loading = ref(true);
const selected = ref([]);
const addCopyDialog = ref(false);
const newCopyShelf = ref("");

const book = ref({});
const copies = ref([]);

const copyColumns = [
  { key: "controlNumber", label: "Control Number" },
  { key: "shelf", label: "Shelf Location" },
  { key: "status", label: "Status" },
  { key: "actions", label: "" },
];

const getStatusColor = (status) => {
  const map = {
    Available: "green",
    Borrowed: "blue",
    Lost: "red",
    Damaged: "orange",
  };
  return map[status] || "gray";
};

onMounted(async () => {
  loading.value = true;
  await new Promise((resolve) => setTimeout(resolve, 600));

  const id = route.params.id;
  book.value = {
    title: "Systems Analysis and Design",
    author: "Kenneth Kendall",
    category: "Technology",
    isbn: "978-0133023442",
    publisher: "Pearson",
    edition: "9th Edition",
  };
  copies.value = [
    { controlNumber: "LIB-2026-004812", shelf: "Row B-3", status: "Available" },
    { controlNumber: "LIB-2026-004813", shelf: "Row B-3", status: "Borrowed" },
  ];
  loading.value = false;
});

const saveNewCopy = () => {
  const newControl = `LIB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`;
  copies.value.push({
    controlNumber: newControl,
    shelf: newCopyShelf.value || "Main Shelf",
    status: "Available",
  });
  newCopyShelf.value = "";
  addCopyDialog.value = false;
};

const printSelectedCopies = (barcodesArray) => {
  navigateTo({
    path: "/librarian/books/print",
    query: { barcodes: barcodesArray.join(",") },
  });
};
</script>
