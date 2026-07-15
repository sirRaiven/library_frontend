<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
  description: string;
  icon: string;
  isAlert?: boolean;
}>();
</script>

<template>
  <div
    class="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-md border border-emerald-100 dark:border-slate-800 flex items-start justify-between transition-all duration-300 ease-out transform hover:-translate-y-1 hover:shadow-md hover:shadow-slate-200 dark:hover:shadow-none"
  >
    <div class="space-y-1">
      <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {{ label }}
      </h3>

      <!-- Added dark:text-white -->
      <div
        class="text-3xl font-bold text-slate-900 dark:text-white tracking-tight"
      >
        {{ value }}
      </div>

      <p class="text-[11px] text-slate-400 font-medium">{{ description }}</p>
    </div>
    <div
      class="p-2.5 rounded-xl flex items-center justify-center shrink-0 transition-colors"
      :class="
        isAlert
          ? 'bg-red-50 dark:bg-red-500/10 text-red-500'
          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'
      "
    >
      <UIcon :name="icon" class="w-5 h-5" />
    </div>
  </div>
</template>
