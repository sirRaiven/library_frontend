<script setup>
definePageMeta({
  layout: "librarian",
  title: "Borrow Books",
});

// Mock state for the scanner workflow
const scannerInput = ref("");
const scannedUser = ref(null);
const scannedBooks = ref([]);
const isProcessing = ref(false);

// Simulated database checks
const handleScan = () => {
  if (!scannerInput.value) return;
  isProcessing.value = true;

  setTimeout(() => {
    const code = scannerInput.value.toUpperCase();

    // 1. Identify if it's a Person (Student/Faculty)
    if (code.startsWith("STU") || code.startsWith("EMP")) {
      scannedUser.value = {
        name: code.startsWith("STU")
          ? "Metchelyn R. Samson"
          : "Jarhen G. Maniego",
        type: code.startsWith("STU") ? "Student" : "Faculty",
        id: code,
        status: "Active",
        borrowLimit: 5,
        currentBorrowed: 2,
      };
    }
    // 2. Identify if it's a Book Copy
    else if (code.startsWith("BOK") && scannedUser.value) {
      // Prevent duplicate scans
      if (!scannedBooks.value.find((b) => b.barcode === code)) {
        scannedBooks.value.push({
          barcode: code,
          title: "Clean Code: A Handbook of Agile Software Craftsmanship",
          author: "Robert C. Martin",
          status: "Available",
        });
      }
    }

    scannerInput.value = "";
    isProcessing.value = false;
  }, 300);
};

const confirmTransaction = () => {
  // Logic to save transaction to Strapi
  alert("Transaction Saved! Receipt printing...");
  scannedUser.value = null;
  scannedBooks.value = [];
};
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div>
      <h2
        class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
      >
        Borrow Books
      </h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Scan a student or faculty ID, followed by the book barcodes.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Scanner & Instructions -->
      <div class="lg:col-span-1 space-y-6">
        <div
          class="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400"
            >
              <UIcon name="i-lucide-scan-line" class="w-5 h-5" />
            </div>
            <h3 class="font-bold text-slate-800 dark:text-white">
              Scanner Input
            </h3>
          </div>

          <form @submit.prevent="handleScan">
            <UInput
              v-model="scannerInput"
              icon="i-lucide-barcode"
              size="lg"
              color="emerald"
              placeholder="Waiting for scanner..."
              :loading="isProcessing"
              autofocus
              class="w-full"
            />
          </form>

          <div class="mt-6 space-y-3">
            <p
              class="text-xs font-semibold text-slate-400 uppercase tracking-wider"
            >
              Current Step
            </p>
            <div
              class="flex items-center gap-2"
              :class="
                !scannedUser
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400'
              "
            >
              <UIcon
                :name="
                  scannedUser ? 'i-lucide-check-circle' : 'i-lucide-circle'
                "
                class="w-4 h-4"
              />
              <span class="text-sm font-medium">1. Scan Person Barcode</span>
            </div>
            <div
              class="flex items-center gap-2"
              :class="
                scannedUser
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400'
              "
            >
              <UIcon
                :name="
                  scannedBooks.length > 0
                    ? 'i-lucide-check-circle'
                    : 'i-lucide-circle'
                "
                class="w-4 h-4"
              />
              <span class="text-sm font-medium">2. Scan Book Barcodes</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Transaction Summary -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Borrower Profile Card -->
        <div
          v-if="scannedUser"
          class="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-emerald-100 dark:border-emerald-900/50 relative overflow-hidden"
        >
          <div class="absolute top-0 right-0 p-4">
            <UBadge color="emerald" variant="subtle">{{
              scannedUser.status
            }}</UBadge>
          </div>
          <div class="flex items-start gap-4">
            <UAvatar
              :alt="scannedUser.name"
              size="lg"
              class="ring-2 ring-emerald-500/20"
            />
            <div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                {{ scannedUser.name }}
              </h3>
              <p
                class="text-sm text-slate-500 dark:text-slate-400 font-mono mt-0.5"
              >
                {{ scannedUser.id }} • {{ scannedUser.type }}
              </p>

              <div class="flex gap-4 mt-4 text-sm">
                <div class="text-slate-600 dark:text-slate-300">
                  <span class="text-slate-400 block text-xs mb-0.5"
                    >Borrow Limit</span
                  >
                  <span class="font-semibold"
                    >{{
                      scannedUser.borrowLimit -
                      scannedUser.currentBorrowed -
                      scannedBooks.length
                    }}
                    remaining</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          v-else
          class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center h-32"
        >
          <UIcon name="i-lucide-user" class="w-8 h-8 text-slate-400 mb-2" />
          <p class="text-sm font-medium text-slate-500">
            Scan a student or faculty ID to begin
          </p>
        </div>

        <!-- Scanned Books List -->
        <div
          v-if="scannedUser"
          class="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden"
        >
          <div
            class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"
          >
            <h3 class="font-bold text-slate-900 dark:text-white">
              Books in this Transaction
            </h3>
            <UBadge color="gray" variant="solid"
              >{{ scannedBooks.length }} items</UBadge
            >
          </div>

          <div v-if="scannedBooks.length === 0" class="p-8 text-center">
            <p class="text-sm text-slate-500">
              No books scanned yet. Scan book barcodes now.
            </p>
          </div>

          <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
            <li
              v-for="book in scannedBooks"
              :key="book.barcode"
              class="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div>
                <p class="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {{ book.title }}
                </p>
                <div class="flex items-center gap-2 mt-1">
                  <span
                    class="text-xs text-slate-500 dark:text-slate-400 font-mono"
                    >{{ book.barcode }}</span
                  >
                  <span class="text-slate-300 dark:text-slate-600">•</span>
                  <span class="text-xs text-slate-500">{{ book.author }}</span>
                </div>
              </div>
              <UButton
                icon="i-lucide-x"
                color="gray"
                variant="ghost"
                size="xs"
                @click="
                  scannedBooks = scannedBooks.filter(
                    (b) => b.barcode !== book.barcode,
                  )
                "
              />
            </li>
          </ul>

          <!-- Action Footer -->
          <div
            class="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3"
          >
            <UButton
              color="gray"
              variant="ghost"
              @click="
                scannedUser = null;
                scannedBooks = [];
              "
              >Cancel</UButton
            >
            <UButton
              color="emerald"
              variant="solid"
              icon="i-lucide-check"
              :disabled="scannedBooks.length === 0"
              @click="confirmTransaction"
            >
              Confirm Borrow
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
