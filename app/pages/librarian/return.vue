<script setup>
definePageMeta({
  layout: "librarian",
  title: "Return Books",
});

const scannerInput = ref("");
const isProcessing = ref(false);
const returnedBooks = ref([]);

const handleScan = () => {
  if (!scannerInput.value) return;
  isProcessing.value = true;

  setTimeout(() => {
    // Simulate finding the active transaction based ONLY on the book barcode
    returnedBooks.value.unshift({
      barcode: scannerInput.value.toUpperCase(),
      title: "Introduction to Embedded Systems",
      borrower: "Metchelyn R. Samson",
      dueDate: "2026-07-14",
      status: "Returned on time",
      penalty: 0,
    });

    scannerInput.value = "";
    isProcessing.value = false;
  }, 300);
};
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <div class="flex items-center justify-between">
      <div>
        <h2
          class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
        >
          Return Books
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Scan book barcodes to process returns instantly.
        </p>
      </div>
    </div>

    <div
      class="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-emerald-100 dark:border-slate-800"
    >
      <!-- Dedicated Scanner Input Area -->
      <div class="max-w-md mx-auto mb-8 text-center">
        <form @submit.prevent="handleScan">
          <UInput
            v-model="scannerInput"
            icon="i-lucide-barcode"
            size="xl"
            color="emerald"
            placeholder="Scan book barcode..."
            :loading="isProcessing"
            autofocus
            class="w-full text-center"
            :ui="{ icon: { trailing: { pointer: '' } } }"
          >
            <template #trailing>
              <UKbd>Enter</UKbd>
            </template>
          </UInput>
        </form>
        <p class="text-xs text-slate-400 mt-3">
          Borrower information is automatically retrieved from the active
          transaction.
        </p>
      </div>

      <!-- Processing Ledger -->
      <div>
        <h3 class="font-bold text-slate-800 dark:text-white mb-4">
          Today's Processed Returns
        </h3>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr
                class="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase text-slate-400 font-bold tracking-wider"
              >
                <th class="pb-3 pl-2">Book Info</th>
                <th class="pb-3">Borrower</th>
                <th class="pb-3">Due Date</th>
                <th class="pb-3">Penalty</th>
                <th class="pb-3 pr-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody class="text-sm">
              <tr v-if="returnedBooks.length === 0">
                <td colspan="5" class="py-8 text-center text-slate-500">
                  No books returned yet today.
                </td>
              </tr>
              <tr
                v-for="(book, idx) in returnedBooks"
                :key="idx"
                class="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
              >
                <td class="py-3.5 pl-2">
                  <p class="font-semibold text-slate-700 dark:text-slate-200">
                    {{ book.title }}
                  </p>
                  <p class="text-xs text-slate-500 font-mono mt-0.5">
                    {{ book.barcode }}
                  </p>
                </td>
                <td class="py-3.5 text-slate-600 dark:text-slate-300">
                  {{ book.borrower }}
                </td>
                <td class="py-3.5 text-slate-500">{{ book.dueDate }}</td>
                <td class="py-3.5">
                  <span
                    :class="
                      book.penalty > 0
                        ? 'text-red-500 font-bold'
                        : 'text-slate-400'
                    "
                  >
                    ₱{{ book.penalty.toFixed(2) }}
                  </span>
                </td>
                <td class="py-3.5 text-right pr-2">
                  <UBadge color="emerald" variant="subtle">{{
                    book.status
                  }}</UBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
