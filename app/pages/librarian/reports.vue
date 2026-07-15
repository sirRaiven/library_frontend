<script setup>
definePageMeta({
  layout: "librarian",
  title: "Reports",
});

const generatedReports = ref([
  {
    id: "REP-2607-A",
    title: "Monthly Circulation Summary",
    type: "Circulation",
    date: "July 1, 2026 - July 31, 2026",
    status: "Ready",
  },
  {
    id: "REP-2607-B",
    title: "Overdue Penalties Ledger",
    type: "Financial",
    date: "Year-to-Date (2026)",
    status: "Ready",
  },
  {
    id: "REP-2607-C",
    title: "Inventory Audit: IT & Engineering",
    type: "Inventory",
    date: "Q2 2026",
    status: "Pending Review",
  },
]);

const reportTypes = [
  { label: "Circulation Activity", icon: "i-lucide-arrow-right-left" },
  { label: "Inventory Status", icon: "i-lucide-boxes" },
  { label: "Fines & Penalties", icon: "i-lucide-coins" },
  { label: "User Demographics", icon: "i-lucide-users" },
];
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <div>
      <h2
        class="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight"
      >
        Analytics & Reports
      </h2>
      <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
        Generate and export library management statistics.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Report Generator Generator -->
      <div class="lg:col-span-1 space-y-6">
        <div
          class="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-emerald-100 dark:border-emerald-200"
        >
          <h3 class="font-bold text-neutral-900 dark:text-white mb-4">
            Generate New Report
          </h3>

          <div class="space-y-4">
            <UFormGroup label="Report Type">
              <USelect
                :options="reportTypes"
                option-attribute="label"
                placeholder="Select type..."
              />
            </UFormGroup>

            <UFormGroup label="Date Range">
              <div class="flex gap-2">
                <UInput type="date" class="w-full" />
                <UInput type="date" class="w-full" />
              </div>
            </UFormGroup>

            <UFormGroup label="Format">
              <URadioGroup
                :options="[
                  { value: 'pdf', label: 'PDF Document' },
                  { value: 'csv', label: 'CSV / Excel Spreadsheet' },
                ]"
              />
            </UFormGroup>

            <UButton color="emerald" block icon="i-lucide-file-bar-chart-2" class="w-full mt-2 text-slate-900 font-bold border border-emerald-100 hover:bg-emerald-100 hover:text-emerald-400 transition-colors">
              Generate Report
            </UButton>
          </div>
        </div>
      </div>

      <!-- Generated Reports Archive -->
      <div class="lg:col-span-2">
        <div
          class="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-200 overflow-hidden"
        >
          <div
            class="px-6 py-4 border-b border-emerald-100 dark:border-emerald-200"
          >
            <h3 class="font-bold text-neutral-900 dark:text-white">
              Recent Exports
            </h3>
          </div>

          <ul class="divide-y divide-emerald-100 dark:divide-emerald-200">
            <li
              v-for="report in generatedReports"
              :key="report.id"
              class="p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 flex items-center justify-between transition-colors"
            >
              <div class="flex items-start gap-4">
                <div
                  class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0"
                >
                  <UIcon name="i-lucide-file-text" class="w-5 h-5" />
                </div>
                <div>
                  <h4 class="font-bold text-neutral-900 dark:text-white">
                    {{ report.title }}
                  </h4>
                  <div
                    class="flex items-center gap-3 mt-1 text-xs text-neutral-500"
                  >
                    <span class="font-mono">{{ report.id }}</span>
                    <span>•</span>
                    <span>{{ report.type }}</span>
                    <span>•</span>
                    <span>{{ report.date }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <UBadge
                  :color="report.status === 'Ready' ? 'emerald' : 'orange'"
                  variant="subtle"
                  >{{ report.status }}</UBadge
                >
                <UButton
                  v-if="report.status === 'Ready'"
                  color="gray"
                  variant="ghost"
                  icon="i-lucide-download"
                  class="text-slate-900 font-bold border border-slate-200 hover:bg-slate-200 transition-colors"
                />
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
