<script setup>
import { ref, nextTick } from "vue";
import JsBarcode from "jsbarcode";

definePageMeta({
  layout: "librarian",
  title: "Books Catalog",
});

// --- Slideover States ---
const isAddTitleOpen = ref(false);
const isManageCopiesOpen = ref(false);
const selectedBook = ref(null);
const physicalCopies = ref([]);

// --- Form States ---
const newTitle = ref({
  title: "",
  author: "",
  isbn: "",
  category: "",
  publisher: "",
});

const books = ref([
  {
    id: 1,
    title: "Clean Code: A Handbook of Agile Software Craftsmanship",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    category: "Computer Science",
    totalCopies: 5,
    availableCopies: 3,
  }
]);

const columns = [
  { id: "title", key: "title", label: "Title & Author" },
  { id: "isbn", key: "isbn", label: "ISBN" },
  { id: "category", key: "category", label: "Category" },
  { id: "inventory", key: "inventory", label: "Physical Copies" },
  { id: "actions", key: "actions", label: "Actions" },
];

const openManageCopies = (book) => {
  selectedBook.value = book;
  isManageCopiesOpen.value = true;
  physicalCopies.value = [];
};

const registerNewCopy = () => {
  const year = new Date().getFullYear();
  const runningNumber = String(Math.floor(Math.random() * 9999) + 1).padStart(6, '0');
  const controlNumber = `LIB-${year}-${runningNumber}`;

  physicalCopies.value.push({
    controlNumber: controlNumber,
    status: 'Available',
    registeredAt: new Date().toLocaleDateString()
  });
};

// --- Print Module Logic ---
const printBarcode = async (controlNumber) => {
  // Wait for the DOM to be ready
  await nextTick();
  
  // Target the SVG element in the teleporter and render the barcode
  JsBarcode("#print-barcode-svg", controlNumber, {
    format: "CODE128",
    width: 2,
    height: 50,
    displayValue: true,
    fontSize: 16,
    textMargin: 6,
    margin: 10
  });

  // Trigger the browser's native print dialog
  window.print();
};
</script>

<template>
  <div class="space-y-6">
    <!-- Main UI Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Library Catalog
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage book titles and track individual physical barcodes.
        </p>
      </div>
      <div class="flex gap-3">
        <UInput icon="i-lucide-search" placeholder="Search title or ISBN..." color="white" />
        <UButton 
          color="emerald" 
          icon="i-lucide-plus" 
          class="font-bold border border-emerald-100 hover:bg-emerald-100"
          @click="isAddTitleOpen = true"
        >
          Add New Title
        </UButton>
      </div>
    </div>

    <!-- Data Table -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-emerald-100">
      <UTable :rows="books" :columns="columns">
        <template #title-data="{ row }">
          <div class="font-medium text-slate-900 dark:text-white">{{ row.title }}</div>
          <div class="text-xs text-slate-500">{{ row.author }}</div>
        </template>
        <template #inventory-data="{ row }">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {{ row.availableCopies }} available
            </span>
            <span class="text-xs text-slate-400">/ {{ row.totalCopies }} total</span>
          </div>
        </template>
        <template #actions-data="{ row }">
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" icon="i-lucide-barcode" @click="openManageCopies(row)">
              Manage Copies
            </UButton>
          </div>
        </template>
      </UTable>
    </div>

    <!-- Physical Copies Slideover -->
    <USlideover v-model="isManageCopiesOpen">
      <template #content>
        <div class="flex flex-col h-full bg-white dark:bg-slate-900 w-full sm:w-150">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 class="text-lg font-bold text-slate-900">Physical Copies</h2>
              <p class="text-sm text-slate-500">{{ selectedBook?.title }}</p>
            </div>
            <UButton icon="i-lucide-x" color="gray" variant="ghost" @click="isManageCopiesOpen = false" />
          </div>

          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <div class="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span class="text-sm font-medium text-slate-700">Register a new physical copy to generate a barcode.</span>
              <UButton color="emerald" icon="i-lucide-plus" @click="registerNewCopy">Register Copy</UButton>
            </div>

            <div class="space-y-3">
              <div v-for="(copy, index) in physicalCopies" :key="index" class="flex items-center justify-between p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <UIcon name="i-lucide-barcode" class="text-slate-400" />
                    <span class="font-mono font-bold text-slate-900 tracking-wider">{{ copy.controlNumber }}</span>
                  </div>
                  <span class="text-xs text-slate-500">Registered: {{ copy.registeredAt }}</span>
                </div>
                
                <div class="flex items-center gap-3">
                  <UBadge color="emerald" variant="soft">{{ copy.status }}</UBadge>
                  <!-- Print Trigger -->
                  <UButton color="gray" variant="ghost" icon="i-lucide-printer" title="Print Label" @click="printBarcode(copy.controlNumber)" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </USlideover>
    
    <!-- Print Layout (Hidden on Screen, Visible on Print) -->
    <ClientOnly>
      <Teleport to="body">
        <div class="hidden print:flex print:fixed print:inset-0 print:bg-white print:z-9999 print:items-start print:justify-center print:pt-12">
          <div class="text-center p-6 border-2 border-slate-800 rounded-xl bg-white">
            <p class="font-bold text-lg mb-1 text-black">SNCBT Library</p>
            <p class="text-sm text-slate-600 mb-4">{{ selectedBook?.title }}</p>
            <svg id="print-barcode-svg"></svg>
          </div>
        </div>
      </Teleport>
    </ClientOnly>

  </div>
</template>