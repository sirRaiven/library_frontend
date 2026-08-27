<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string;
    author?: string | null;
    callNumber?: string | null;
    classification?: string | null;
    category?: string | null;
    coverUrl?: string | null;
    coverAlt?: string | null;
    size?: "card" | "detail";
  }>(),
  {
    author: null,
    callNumber: null,
    classification: null,
    category: null,
    coverUrl: null,
    coverAlt: null,
    size: "card",
  },
);

const coverThemes = [
  "bg-gradient-to-br from-emerald-100 via-teal-50 to-sky-100 text-emerald-700 ring-emerald-200/70 dark:from-emerald-950/85 dark:via-teal-950/60 dark:to-sky-950/45 dark:text-emerald-300 dark:ring-emerald-800/60",
  "bg-gradient-to-br from-indigo-100 via-violet-50 to-fuchsia-100 text-indigo-700 ring-indigo-200/70 dark:from-indigo-950/85 dark:via-violet-950/60 dark:to-fuchsia-950/45 dark:text-indigo-300 dark:ring-indigo-800/60",
  "bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 text-amber-800 ring-amber-200/70 dark:from-amber-950/80 dark:via-orange-950/55 dark:to-rose-950/45 dark:text-amber-300 dark:ring-amber-800/60",
  "bg-gradient-to-br from-sky-100 via-cyan-50 to-emerald-100 text-sky-700 ring-sky-200/70 dark:from-sky-950/85 dark:via-cyan-950/60 dark:to-emerald-950/45 dark:text-sky-300 dark:ring-sky-800/60",
] as const;

const themeClass = computed(() => {
  const seed = `${props.title}|${props.author ?? ""}|${props.callNumber ?? ""}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return coverThemes[hash % coverThemes.length] ?? coverThemes[0];
});

const primaryLabel = computed(() => {
  const classification = props.classification?.trim();
  if (classification) return classification;

  const callNumber = props.callNumber?.trim();
  if (callNumber) return callNumber.split(/\s+/)[0] || callNumber;

  return props.category?.trim() || "Library Book";
});

const secondaryLabel = computed(() => {
  const callNumber = props.callNumber?.trim();
  if (callNumber && callNumber !== primaryLabel.value) return callNumber;

  return props.author?.trim() || "SNCBT Collection";
});

const detail = computed(() => props.size === "detail");
</script>

<template>
  <div
    class="relative flex overflow-hidden rounded-2xl ring-1 ring-inset"
    :class="themeClass"
  >
    <img
      v-if="coverUrl"
      :src="coverUrl"
      :alt="coverAlt || `Cover of ${title}`"
      class="absolute inset-0 size-full object-cover"
      loading="lazy"
      decoding="async"
    >

    <template v-else>
      <span
        class="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/40 blur-sm dark:bg-white/5"
        aria-hidden="true"
      />
      <span
        class="pointer-events-none absolute -bottom-12 -left-12 size-36 rounded-full bg-white/35 blur-sm dark:bg-white/5"
        aria-hidden="true"
      />
      <span
        class="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-current opacity-40"
        aria-hidden="true"
      />
      <span
        class="pointer-events-none absolute inset-x-5 top-[44%] border-t border-current/10"
        aria-hidden="true"
      />

      <div
        class="relative flex h-full w-full flex-col text-left"
        :class="detail ? 'p-6 sm:p-7' : 'p-4 sm:p-5'"
      >
        <div
          class="flex items-center justify-center rounded-xl bg-white/75 shadow-sm ring-1 ring-black/5 backdrop-blur-sm dark:bg-neutral-950/35 dark:ring-white/10"
          :class="detail ? 'size-14' : 'size-11'"
        >
          <UIcon
            name="i-lucide-book-open"
            :class="detail ? 'size-7' : 'size-5.5'"
          />
        </div>

        <div class="mt-auto min-w-0">
          <span
            class="block font-bold uppercase opacity-65"
            :class="detail ? 'text-[11px] tracking-[0.22em]' : 'text-[9px] tracking-[0.18em]'"
          >
            SNCBT Library
          </span>
          <span
            class="mt-2 block break-words font-bold leading-tight tracking-tight"
            :class="detail ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'"
          >
            {{ primaryLabel }}
          </span>
          <span
            class="mt-2 block line-clamp-2 font-semibold uppercase opacity-60"
            :class="detail ? 'text-xs tracking-[0.16em]' : 'text-[10px] tracking-[0.13em]'"
          >
            {{ secondaryLabel }}
          </span>
          <span
            class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/55 px-2.5 py-1 font-semibold uppercase ring-1 ring-black/5 backdrop-blur-sm dark:bg-neutral-950/25 dark:ring-white/10"
            :class="detail ? 'text-[10px] tracking-[0.13em]' : 'text-[9px] tracking-[0.11em]'"
          >
            <UIcon name="i-lucide-library" class="size-3" />
            Collection
          </span>
        </div>
      </div>
    </template>
  </div>
</template>
