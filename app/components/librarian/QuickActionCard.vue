<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  icon: string;
}>();
</script>

<template>
  <button
    class="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 transition-all duration-300 ease-out transform hover:-translate-y-1 hover:border-emerald-500 hover:bg-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/10 text-left w-full group"
  >
    <!-- Icon Container -->
    <div
      class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300"
    >
      <UIcon :name="icon" class="w-5 h-5" />
    </div>

    <!-- Text Content -->
    <div>
      <h4
        class="font-bold text-sm tracking-tight text-slate-800 dark:text-white transition-colors"
      >
        {{ title }}
      </h4>
      <p
        class="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 leading-normal transition-colors"
      >
        {{ description }}
      </p>
    </div>
  </button>
</template>
