<template>
  <div
    class="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 h-full transition-colors"
  >
    <div class="mb-5">
      <h3
        class="font-bold text-slate-800 dark:text-white tracking-tight transition-colors"
      >
        Circulation Workflow
      </h3>
      <p
        class="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 transition-colors"
      >
        Recommended process for issuing books.
      </p>
    </div>

    <div class="space-y-6 relative">
      <div
        class="absolute left-3 top-4 bottom-4 w-[1px] bg-slate-100 dark:bg-slate-800 z-0 transition-colors"
      ></div>

      <div class="flex items-start gap-4 relative z-10">
        <div
          class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm shadow-emerald-100 dark:shadow-none"
        >
          1
        </div>
        <div>
          <h4
            class="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors"
          >
            Scan Patron ID
          </h4>
          <p
            class="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 transition-colors"
          >
            Verify member standing and borrowing limits.
          </p>
        </div>
      </div>

      <div class="flex items-start gap-4 relative z-10">
        <div
          class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm shadow-emerald-100 dark:shadow-none"
        >
          2
        </div>
        <div>
          <h4
            class="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors"
          >
            Scan Book Barcode
          </h4>
          <p
            class="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 transition-colors"
          >
            Append system catalog items to current active session.
          </p>
        </div>
      </div>

      <div class="flex items-start gap-4 relative z-10">
        <div
          class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm shadow-emerald-100 dark:shadow-none"
        >
          3
        </div>
        <div>
          <h4
            class="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors"
          >
            Confirm & Release
          </h4>
          <p
            class="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 transition-colors"
          >
            Commit adjustments to database logs and dispatch item.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
