<script setup lang="ts">
definePageMeta({
  layout: "librarian",
  title: "Library Memberships",
});

// State for the slideover and form
const isRegistrationOpen = ref(false);
const searchQuery = ref("");
const isSearching = ref(false);

// Template ref for autofocusing the barcode field
const barcodeInputRef = ref<any>(null);

// Form State
const state = reactive({
  studentId: "",
  semester: "1st",
  academicYear: "2026-2027",
  barcode: "",
});

const semesters = ["1st", "2nd", "Summer"];

// Mock Summary Stats (matching dashboard design system)
const summaryStats = [
  {
    label: "Total Memberships",
    value: "4,208",
    desc: "Registered library users",
    icon: "i-lucide-users",
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    label: "Active This Term",
    value: "3,115",
    desc: "Currently enrolled and verified",
    icon: "i-lucide-user-check",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    label: "Requires Renewal",
    value: "84",
    desc: "Expired or pending validation",
    icon: "i-lucide-alert-circle",
    colorClass: "text-error-600 dark:text-error-400",
    bgClass: "bg-error-50 dark:bg-error-900/20",
  },
];

// Mock search result for demonstration
const verifiedStudent = ref<{
  student_no: string;
  name: string;
  course: string;
  status: string;
} | null>(null);

const handleSearch = async () => {
  if (!searchQuery.value) return;
  isSearching.value = true;

  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 600));

  verifiedStudent.value = {
    student_no: searchQuery.value,
    name: "Juan Dela Cruz",
    course: "BS Information Technology - 3rd Year",
    status: "Enrolled",
  };
  state.studentId = searchQuery.value;
  isSearching.value = false;
};

watch(verifiedStudent, async (newVal) => {
  if (newVal) {
    await nextTick();
    const inputEl =
      barcodeInputRef.value?.$el?.querySelector("input") ||
      barcodeInputRef.value?.inputRef;
    if (inputEl) {
      inputEl.focus();
    } else {
      barcodeInputRef.value?.focus?.();
    }
  }
});

const generateBarcode = () => {
  const year = new Date().getFullYear();
  const sequence = Math.floor(10000 + Math.random() * 90000);
  state.barcode = `LIB-${year}-${sequence}`;
};

const submitRegistration = async () => {
  console.log("Registering:", state);
  isRegistrationOpen.value = false;
  verifiedStudent.value = null;
  searchQuery.value = "";
  state.barcode = "";
};
</script>

<template>
  <div class="h-full flex flex-col gap-6">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1
          class="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight"
        >
          Library Memberships
        </h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
          Manage student and faculty library cards, track active semesters, and
          issue new barcode credentials.
        </p>
      </div>

      <UButton
        icon="i-lucide-plus"
        color="success"
        size="lg"
        class="font-semibold shadow-sm rounded-xl px-5"
        @click="
          () => {
            isRegistrationOpen = true;
          }
        "
      >
        Register Member
      </UButton>
    </div>

    <!-- Stats Row (Matches Dashboard Design) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="stat in summaryStats"
        :key="stat.label"
        class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex items-start justify-between shadow-sm transition-shadow hover:shadow-md"
      >
        <div>
          <p
            class="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1"
          >
            {{ stat.label }}
          </p>
          <h3
            class="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight mb-1"
          >
            {{ stat.value }}
          </h3>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ stat.desc }}
          </p>
        </div>
        <div
          :class="[
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            stat.bgClass,
            stat.colorClass,
          ]"
        >
          <UIcon :name="stat.icon" class="w-5 h-5" />
        </div>
      </div>
    </div>

    <!-- Main Data Table Container -->
    <div
      class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden"
    >
      <!-- Toolbar -->
      <div
        class="flex flex-col sm:flex-row items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800 gap-4 bg-neutral-50/50 dark:bg-neutral-900/50"
      >
        <UInput
          icon="i-lucide-search"
          placeholder="Search members by name, ID, or barcode..."
          class="w-full sm:w-80"
          :ui="{ base: 'bg-white dark:bg-neutral-950 shadow-sm' }"
        />
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <USelect
            :options="semesters"
            placeholder="Semester"
            class="w-full sm:w-32"
            :ui="{ base: 'bg-white dark:bg-neutral-950 shadow-sm' }"
          />
          <USelect
            :options="['Active', 'Expired', 'Suspended']"
            placeholder="Status"
            class="w-full sm:w-32"
            :ui="{ base: 'bg-white dark:bg-neutral-950 shadow-sm' }"
          />
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-filter"
            class="shrink-0"
          />
        </div>
      </div>

      <!-- Placeholder for UTable -->
      <div
        class="flex-1 p-12 flex flex-col items-center justify-center text-center"
      >
        <div
          class="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mb-4 text-neutral-400"
        >
          <UIcon name="i-lucide-users" class="w-8 h-8" />
        </div>
        <h3
          class="text-base font-semibold text-neutral-900 dark:text-white mb-1"
        >
          No members found
        </h3>
        <p class="text-sm text-neutral-500 max-w-sm">
          Membership table records will render here. Adjust your filters or
          register a new member to see data.
        </p>
      </div>
    </div>

    <!-- Registration Slideover -->
    <USlideover v-model="isRegistrationOpen">
      <template #content>
        <div
          class="flex flex-col h-full bg-white dark:bg-neutral-900 w-full sm:w-112.5"
        >
          <!-- Slideover Header -->
          <div
            class="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-sm"
          >
            <div>
              <h2
                class="text-lg font-bold text-neutral-900 dark:text-white tracking-tight"
              >
                New Registration
              </h2>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                Activate library access for the current term.
              </p>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              class="rounded-full"
              @click="
                () => {
                  isRegistrationOpen = false;
                }
              "
            />
          </div>

          <!-- Slideover Body -->
          <div class="flex-1 overflow-y-auto p-6 space-y-8">
            <!-- Step 1: Search Student -->
            <section>
              <div class="flex items-center gap-3 mb-4">
                <span
                  class="flex items-center justify-center w-7 h-7 rounded-lg bg-success/10 text-success font-bold text-xs border border-success/20"
                >
                  1
                </span>
                <h3
                  class="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider"
                >
                  Find Record
                </h3>
              </div>

              <div class="flex gap-2">
                <UInput
                  v-model="searchQuery"
                  placeholder="Enter ID No. (e.g. 2023-0001)"
                  icon="i-lucide-user-search"
                  class="flex-1"
                  @keyup.enter="handleSearch"
                />
                <UButton
                  color="neutral"
                  variant="soft"
                  :loading="isSearching"
                  @click="handleSearch"
                >
                  Search
                </UButton>
              </div>

              <!-- Verification Card -->
              <div
                v-if="verifiedStudent"
                class="mt-4 p-4 rounded-xl border border-success/30 bg-success/5 dark:bg-success/10 transition-all shadow-sm"
              >
                <div class="flex justify-between items-start mb-2">
                  <p class="font-bold text-neutral-900 dark:text-white">
                    {{ verifiedStudent.name }}
                  </p>
                  <UBadge
                    color="success"
                    variant="soft"
                    size="sm"
                    class="rounded-md"
                  >
                    {{ verifiedStudent.status }}
                  </UBadge>
                </div>
                <p
                  class="text-sm text-neutral-600 dark:text-neutral-400 mb-1 flex items-center gap-2"
                >
                  <UIcon
                    name="i-lucide-fingerprint"
                    class="w-4 h-4 opacity-70"
                  />
                  {{ verifiedStudent.student_no }}
                </p>
                <p
                  class="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-2"
                >
                  <UIcon
                    name="i-lucide-graduation-cap"
                    class="w-4 h-4 opacity-70"
                  />
                  {{ verifiedStudent.course }}
                </p>
              </div>
            </section>

            <!-- Step 2: Term Configuration -->
            <section
              :class="{
                'opacity-50 pointer-events-none grayscale transition-all':
                  !verifiedStudent,
              }"
            >
              <div class="flex items-center gap-3 mb-4">
                <span
                  class="flex items-center justify-center w-7 h-7 rounded-lg bg-success/10 text-success font-bold text-xs border border-success/20"
                >
                  2
                </span>
                <h3
                  class="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider"
                >
                  Membership Term
                </h3>
              </div>

              <div
                class="grid grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800"
              >
                <UFormField label="Academic Year">
                  <UInput
                    v-model="state.academicYear"
                    class="bg-white dark:bg-neutral-900"
                  />
                </UFormField>
                <UFormField label="Semester">
                  <USelect
                    v-model="state.semester"
                    :options="semesters"
                    class="w-full bg-white dark:bg-neutral-900"
                  />
                </UFormField>
              </div>
            </section>

            <!-- Step 3: Barcode Assignment -->
            <section
              :class="{
                'opacity-50 pointer-events-none grayscale transition-all':
                  !verifiedStudent,
              }"
            >
              <div class="flex items-center gap-3 mb-4">
                <span
                  class="flex items-center justify-center w-7 h-7 rounded-lg bg-success/10 text-success font-bold text-xs border border-success/20"
                >
                  3
                </span>
                <h3
                  class="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider"
                >
                  Assign Credentials
                </h3>
              </div>

              <UFormField>
                <div class="flex gap-2">
                  <UInput
                    ref="barcodeInputRef"
                    v-model="state.barcode"
                    placeholder="Scan physical card or generate..."
                    icon="i-lucide-barcode"
                    class="flex-1"
                    size="lg"
                  />
                  <UButton
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-sparkles"
                    size="lg"
                    @click="generateBarcode"
                  >
                    Auto
                  </UButton>
                </div>
                <p class="text-xs text-neutral-500 mt-3 leading-relaxed">
                  Focus the input field and scan the physical library card to
                  link it, or click Auto to generate a system-only digital
                  barcode.
                </p>
              </UFormField>
            </section>
          </div>

          <!-- Slideover Footer -->
          <div
            class="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
          >
            <UButton
              color="success"
              size="xl"
              block
              icon="i-lucide-check-circle"
              :disabled="!verifiedStudent || !state.barcode"
              class="font-semibold shadow-md rounded-xl transition-all"
              @click="submitRegistration"
            >
              Activate Membership
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
