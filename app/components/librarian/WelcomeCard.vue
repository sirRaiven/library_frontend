<template>
  <div
    class="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center relative overflow-hidden transition-colors"
  >
    <div class="space-y-4 z-10">
      <div
        class="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-medium"
      >
        <UIcon name="i-lucide-shield-check" class="w-3.5 h-3.5" />
        Librarian Operational Portal
      </div>

      <div>
        <h2
          class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors"
        >
          Welcome to your Library System
        </h2>
        <p
          class="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed transition-colors"
        >
          Manage book circulation, design catalogs, monitor borrowing history,
          and oversee library operations in one secure dashboard.
        </p>
      </div>

      <div class="flex gap-3 pt-2">
        <button
          class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm shadow-emerald-200 dark:shadow-none"
        >
          <UIcon name="i-lucide-plus" class="w-4 h-4" />
          Issue Book
        </button>
        <button
          class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <UIcon
            name="i-lucide-external-link"
            class="w-4 h-4 text-slate-400 dark:text-slate-500"
          />
          Public OPAC
        </button>
      </div>
    </div>

    <div
      class="hidden lg:flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 min-w-[220px] z-10 transition-colors"
    >
      <div
        class="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-3 shadow-md shadow-emerald-200 dark:shadow-none"
      >
        <UIcon name="i-lucide-refresh-cw" class="w-6 h-6 animate-spin-slow" />
      </div>
      <span class="text-sm font-bold text-slate-800 dark:text-slate-100"
        >System Status</span
      >
      <span class="text-xs text-slate-400 text-center mt-1 leading-normal"
        >Ready for circulation<br />& catalog processing</span
      >
    </div>
  </div>
</template>

<style scoped>
.animate-spin-slow {
  animation: spin 8s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
