<script setup lang="ts">
import type { MembershipRecord, StudentMember } from "~/composables/useLibraryMembers";

const props = withDefaults(
  defineProps<{
    student: StudentMember;
    membership?: MembershipRecord | null;
    showActions?: boolean;
  }>(),
  { membership: null, showActions: true },
);

const toast = useToast();
const card = ref<HTMLElement | null>(null);
const barcode = ref<SVGSVGElement | null>(null);
const downloading = ref(false);

const activeMembership = computed(
  () => props.membership ?? props.student.membership,
);

const initials = computed(() =>
  [props.student.firstName, props.student.lastName]
    .map((value) => value?.charAt(0).toUpperCase())
    .join(""),
);

function statusColor(status?: string | null) {
  if (status === "Active") return "success";
  if (status === "Suspended") return "warning";
  return "error";
}

async function renderBarcode() {
  if (!import.meta.client || !barcode.value) return;
  const { default: JsBarcode } = await import("jsbarcode");
  JsBarcode(barcode.value, props.student.barcode, {
    format: "CODE128",
    width: 1.5,
    height: 44,
    margin: 3,
    displayValue: true,
    fontSize: 11,
    background: "#ffffff",
    lineColor: "#111827",
  });
}

async function downloadCard() {
  if (!card.value) return;
  downloading.value = true;
  try {
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(card.value, {
      backgroundColor: "#ffffff",
      cacheBust: true,
      pixelRatio: 3,
    });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${props.student.libraryCardNo}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    toast.add({
      title: "Download failed",
      description: error instanceof Error ? error.message : "Unable to download card.",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    downloading.value = false;
  }
}

onMounted(async () => {
  await nextTick();
  await renderBarcode();
});

watch(() => props.student.barcode, async () => {
  await nextTick();
  await renderBarcode();
});
</script>

<template>
  <div class="space-y-4">
    <div
      ref="card"
      class="relative mx-auto aspect-[1.586/1] w-full max-w-135 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white text-slate-950 shadow-xl"
    >
      <div class="absolute inset-x-0 top-0 h-2 bg-emerald-600" />
      <div class="absolute -right-20 -top-20 size-56 rounded-full bg-emerald-50" />
      <div class="relative flex h-full flex-col p-5 sm:p-6">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <UIcon name="i-lucide-library-big" class="size-5" />
            </div>
            <div>
              <p class="text-sm font-black tracking-wide">SNCBT LIBRARY</p>
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Student Library Card</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-[9px] uppercase tracking-wider text-slate-500">Card Number</p>
            <p class="font-mono text-xs font-bold">{{ student.libraryCardNo }}</p>
          </div>
        </div>

        <div class="mt-4 grid min-h-0 flex-1 grid-cols-[4.5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
          <div class="flex aspect-3/4 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <img v-if="student.photoUrl" :src="student.photoUrl" :alt="student.fullName" class="size-full object-cover" />
            <span v-else class="text-xl font-black text-slate-500">{{ initials }}</span>
          </div>
          <div class="min-w-0">
            <p class="truncate text-base font-black uppercase sm:text-lg">{{ student.fullName }}</p>
            <p class="mt-0.5 font-mono text-xs font-bold text-emerald-700">{{ student.studentNo }}</p>
            <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] sm:text-xs">
              <div>
                <p class="uppercase tracking-wide text-slate-500">Program</p>
                <p class="line-clamp-1 font-semibold">{{ student.course }}</p>
              </div>
              <div>
                <p class="uppercase tracking-wide text-slate-500">Year / Section</p>
                <p class="font-semibold">{{ [student.yearLevel ? `Year ${student.yearLevel}` : "", student.section].filter(Boolean).join(" • ") || "—" }}</p>
              </div>
              <div>
                <p class="uppercase tracking-wide text-slate-500">Valid Term</p>
                <p class="line-clamp-1 font-semibold">{{ activeMembership?.semester ?? "Not renewed" }}</p>
              </div>
              <div>
                <p class="uppercase tracking-wide text-slate-500">Valid Until</p>
                <p class="font-semibold">{{ activeMembership?.expiryDate ?? "Expired" }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-3 flex items-end justify-between gap-3">
          <div class="min-w-0 flex-1 overflow-hidden rounded-lg bg-white">
            <svg ref="barcode" class="h-auto max-w-full" role="img" />
          </div>
          <div class="shrink-0 text-right">
            <p class="text-[9px] uppercase tracking-wide text-slate-500">Status</p>
            <UBadge :color="statusColor(activeMembership?.status)" variant="soft" size="sm">
              {{ activeMembership?.status ?? "Expired" }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>

    <UButton
      v-if="showActions"
      label="Download Card PNG"
      icon="i-lucide-download"
      color="success"
      variant="soft"
      block
      :loading="downloading"
      @click="downloadCard"
    />
  </div>
</template>
