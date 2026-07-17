<template>
  <UContainer class="max-w-4xl py-8">
    <!-- STEP 1: Registration Form -->
    <UCard v-if="!isSuccess">
      <template #header>
        <h2 class="text-xl font-bold">Register New Book</h2>
      </template>

      <form @submit.prevent="registerBook" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormGroup label="Title" class="md:col-span-2" required>
            <UInput v-model="bookForm.title" placeholder="Enter book title" />
          </UFormGroup>

          <UFormGroup label="Author" required>
            <UInput v-model="bookForm.author" placeholder="Enter author name" />
          </UFormGroup>

          <UFormGroup label="ISBN">
            <UInput
              v-model="bookForm.isbn"
              placeholder="e.g., 978-0133023442"
            />
          </UFormGroup>

          <UFormGroup label="Category">
            <USelect
              v-model="bookForm.category"
              :options="categories"
              placeholder="Select category"
            />
          </UFormGroup>

          <UFormGroup label="Publisher">
            <UInput v-model="bookForm.publisher" placeholder="Publisher name" />
          </UFormGroup>

          <UFormGroup label="Edition">
            <UInput
              v-model="bookForm.edition"
              placeholder="e.g., 1st Edition"
            />
          </UFormGroup>

          <UFormGroup label="Year Published">
            <UInput
              v-model="bookForm.yearPublished"
              type="number"
              placeholder="YYYY"
            />
          </UFormGroup>
        </div>

        <UDivider class="my-2" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormGroup label="Number of Physical Copies" required>
            <UInput
              v-model.number="bookForm.numberOfCopies"
              type="number"
              min="1"
            />
          </UFormGroup>
          <UFormGroup label="Initial Shelf Location" required>
            <UInput
              v-model="bookForm.shelfLocation"
              placeholder="e.g., Row A-1"
            />
          </UFormGroup>
        </div>

        <div class="flex justify-end pt-4">
          <UButton type="submit" color="primary" size="lg"
            >Register Book</UButton
          >
        </div>
      </form>
    </UCard>

    <!-- STEP 2 & 3: Success Screen & Generated Copies -->
    <div v-else class="space-y-6">
      <!-- Success Summary -->
      <div
        class="bg-green-50 border border-green-200 rounded-lg p-5 flex items-start gap-4"
      >
        <UIcon
          name="i-heroicons-check-circle"
          class="w-8 h-8 text-green-500 mt-1"
        />
        <div>
          <h2 class="text-lg font-bold text-green-800 mb-1">
            Book Registered Successfully
          </h2>
          <div class="text-gray-800 font-medium">{{ bookForm.title }}</div>
          <div class="text-gray-600 text-sm">{{ bookForm.author }}</div>
          <div class="text-sm font-bold mt-2 text-green-700">
            {{ bookForm.numberOfCopies }} Physical Copies Created
          </div>
        </div>
      </div>

      <!-- Bulk Actions Bar -->
      <div
        v-if="generatedCopies.length > 0"
        class="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between"
      >
        <UCheckbox v-model="selectAll" label="Select All" />
        <UButton
          color="primary"
          icon="i-heroicons-printer"
          :disabled="selectedCopies.length === 0"
          @click="printSelectedBarcodes"
        >
          Print Selected ({{ selectedCopies.length }})
        </UButton>
      </div>

      <!-- Individual Copy Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UCard
          v-for="(copy, index) in generatedCopies"
          :key="copy.controlNumber"
          class="flex flex-col h-full"
        >
          <template #header>
            <div class="flex items-center gap-3 font-semibold text-sm">
              <UCheckbox v-model="selectedCopies" :value="copy.controlNumber" />
              📖 Physical Copy #{{ index + 1 }}
            </div>
          </template>

          <div class="space-y-4">
            <div>
              <div
                class="text-xs text-gray-500 uppercase font-semibold tracking-wider"
              >
                Control Number
              </div>
              <div class="text-lg font-black tracking-wide">
                {{ copy.controlNumber }}
              </div>

              <!-- Visual Barcode Placeholder -->
              <div
                class="mt-3 border-2 border-dashed border-gray-200 bg-gray-50 rounded p-4 flex items-center justify-center gap-2"
              >
                <UIcon
                  name="i-heroicons-qr-code"
                  class="w-6 h-6 text-gray-400"
                />
                <span class="font-mono text-gray-500 font-medium">{{
                  copy.controlNumber
                }}</span>
              </div>
            </div>

            <UDivider />

            <div class="grid grid-cols-3 gap-y-2 text-sm">
              <div class="text-gray-500">Status</div>
              <div class="col-span-2 font-medium flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                Available
              </div>
              <div class="text-gray-500">Shelf</div>
              <div class="col-span-2 font-medium">{{ copy.shelf }}</div>
            </div>
          </div>
        </UCard>
      </div>

      <UButton
        variant="ghost"
        icon="i-heroicons-arrow-left"
        class="mt-4"
        @click="resetForm"
      >
        Register Another Book
      </UButton>
    </div>
  </UContainer>
</template>

<script setup>
import { ref, reactive, computed } from "vue";

const isSuccess = ref(false);
const selectedCopies = ref([]);

const bookForm = reactive({
  title: "",
  author: "",
  isbn: "",
  category: "",
  publisher: "",
  edition: "",
  yearPublished: null,
  numberOfCopies: 1,
  shelfLocation: "",
});

const categories = [
  "Technology",
  "Science",
  "Mathematics",
  "Literature",
  "History",
  "Embedded Systems",
];
const generatedCopies = ref([]);

const selectAll = computed({
  get: () =>
    generatedCopies.value.length > 0 &&
    selectedCopies.value.length === generatedCopies.value.length,
  set: (val) => {
    selectedCopies.value = val
      ? generatedCopies.value.map((c) => c.controlNumber)
      : [];
  },
});

const registerBook = async () => {
  if (!bookForm.title || !bookForm.author || !bookForm.shelfLocation) return;

  await new Promise((resolve) => setTimeout(resolve, 500));

  const newCopies = [];
  const year = new Date().getFullYear();

  for (let i = 0; i < bookForm.numberOfCopies; i++) {
    const incrementalId = String(
      Math.floor(Math.random() * 900000) + 100000,
    ).padStart(6, "0");
    newCopies.push({
      controlNumber: `LIB-${year}-${incrementalId}`,
      status: "Available",
      shelf: bookForm.shelfLocation,
    });
  }

  generatedCopies.value = newCopies;
  isSuccess.value = true;
};

const printSelectedBarcodes = () => {
  if (selectedCopies.value.length === 0) return;
  navigateTo({
    path: "/librarian/books/print",
    query: { barcodes: selectedCopies.value.join(",") },
  });
};

const resetForm = () => {
  isSuccess.value = false;
  generatedCopies.value = [];
  selectedCopies.value = [];
  Object.keys(bookForm).forEach(
    (key) => (bookForm[key] = key === "numberOfCopies" ? 1 : ""),
  );
};
</script>
