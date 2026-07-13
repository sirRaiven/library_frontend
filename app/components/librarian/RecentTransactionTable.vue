<script setup lang="ts">
const transactions = ref([
  {
    patron: "METCHELYN R. SAMSON",
    code: "BOK-SCI-8109884875",
    type: "Faculty",
    status: "Issued",
    date: "Jul 13, 2026",
  },
  {
    patron: "CATHERINE JOY P. CALMA",
    code: "BOK-FIC-8781895331",
    type: "Student",
    status: "Returned",
    date: "Jul 13, 2026",
  },
  {
    patron: "JARHEN G. MANIEGO",
    code: "BOK-HIS-7203068624",
    type: "Student",
    status: "Issued",
    date: "Jul 13, 2026",
  },
]);
</script>

<template>
  <div
    class="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors"
  >
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
    >
      <div>
        <h3
          class="font-bold text-slate-800 dark:text-white tracking-tight transition-colors"
        >
          Recent Circulation Activities
        </h3>
        <p
          class="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 transition-colors"
        >
          Showing the latest processed system ledger transactions.
        </p>
      </div>
      <button
        class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 self-start sm:self-center transition-colors"
      >
        View All Records
        <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse whitespace-nowrap">
        <thead>
          <tr
            class="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-wider transition-colors"
          >
            <th class="pb-3 pl-2">Patron Identity</th>
            <th class="pb-3">Item Barcode</th>
            <th class="pb-3">Patron Class</th>
            <th class="pb-3">Activity Status</th>
            <th class="pb-3 pr-2 text-right">Processing Date</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr
            v-for="(row, idx) in transactions"
            :key="idx"
            class="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <td class="py-3.5 pl-2 flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0"
              >
                <UIcon name="i-lucide-user" class="w-4 h-4" />
              </div>
              <span
                class="font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                >{{ row.patron }}</span
              >
            </td>
            <td
              class="py-3.5 text-slate-500 dark:text-slate-400 text-xs font-mono tracking-tight transition-colors"
            >
              {{ row.code }}
            </td>
            <td
              class="py-3.5 text-slate-500 dark:text-slate-400 font-medium transition-colors"
            >
              {{ row.type }}
            </td>
            <td class="py-3.5">
              <span
                class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors"
                :class="
                  row.status === 'Issued'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                "
              >
                {{ row.status }}
              </span>
            </td>
            <td
              class="py-3.5 text-slate-400 dark:text-slate-500 text-xs font-medium text-right pr-2 transition-colors"
            >
              {{ row.date }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
