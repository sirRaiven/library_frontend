<script setup lang="ts">
type CopyStatus =
  | "Available"
  | "Borrowed"
  | "Reserved"
  | "Damaged"
  | "Lost"
  | "Archived";

interface Props {
  controlNumber: string;
  title?: string;
  author?: string;
  shelfLocation?: string;
  status?: CopyStatus;
  condition?: string;
  institutionName?: string;
  showDownload?: boolean;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  author: "",
  shelfLocation: "",
  status: "Available",
  condition: "Good",
  institutionName: "SNCBT LIBRARY",
  showDownload: true,
  compact: false,
});

const emit = defineEmits<{
  downloaded: [controlNumber: string];
  error: [message: string];
}>();

const toast = useToast();

const barcodeSvg = ref<SVGSVGElement | null>(null);
const labelElement = ref<HTMLElement | null>(null);

const isMounted = ref(false);
const isRendering = ref(false);
const isDownloading = ref(false);
const barcodeError = ref("");

const normalizedControlNumber = computed(() =>
  props.controlNumber.trim().toUpperCase(),
);

const statusColor = computed(() => {
  const colors: Record<
    CopyStatus,
    "success" | "warning" | "info" | "error" | "neutral"
  > = {
    Available: "success",
    Borrowed: "warning",
    Reserved: "info",
    Damaged: "error",
    Lost: "error",
    Archived: "neutral",
  };

  return colors[props.status];
});

const safeFilename = computed(() => {
  const value = normalizedControlNumber.value || "book-barcode";

  return value.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-");
});

async function renderBarcode() {
  if (!import.meta.client || !barcodeSvg.value) {
    return;
  }

  barcodeError.value = "";

  if (!normalizedControlNumber.value) {
    barcodeSvg.value.innerHTML = "";
    barcodeError.value = "A control number is required.";
    return;
  }

  isRendering.value = true;

  try {
    const barcodeModule = await import("jsbarcode");
    const JsBarcode = barcodeModule.default;

    JsBarcode(barcodeSvg.value, normalizedControlNumber.value, {
      format: "CODE128",
      width: props.compact ? 1.5 : 2,
      height: props.compact ? 48 : 64,
      displayValue: true,
      font: "Arial",
      fontSize: props.compact ? 13 : 16,
      textMargin: 6,
      margin: 8,
      background: "#ffffff",
      lineColor: "#111827",
      valid(valid: boolean) {
        if (!valid) {
          barcodeError.value = "The control number cannot be encoded.";
        }
      },
    });
  } catch (error) {
    console.error("Unable to render barcode:", error);

    barcodeError.value = "Unable to generate the barcode.";
    emit("error", barcodeError.value);
  } finally {
    isRendering.value = false;
  }
}

async function createPngDataUrl(): Promise<string> {
  if (!labelElement.value) {
    throw new Error("The barcode label is not ready.");
  }

  if (barcodeError.value) {
    throw new Error(barcodeError.value);
  }

  const { toPng } = await import("html-to-image");

  return await toPng(labelElement.value, {
    backgroundColor: "#ffffff",
    cacheBust: true,
    pixelRatio: 3,
  });
}

async function downloadPng() {
  if (!import.meta.client || isDownloading.value) {
    return;
  }

  isDownloading.value = true;

  try {
    const dataUrl = await createPngDataUrl();

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${safeFilename.value}.png`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    emit("downloaded", normalizedControlNumber.value);

    toast.add({
      title: "Barcode downloaded",
      description: `${normalizedControlNumber.value}.png was created successfully.`,
      color: "success",
      icon: "i-lucide-download",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to download the barcode.";

    emit("error", message);

    toast.add({
      title: "Download failed",
      description: message,
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isDownloading.value = false;
  }
}

onMounted(async () => {
  isMounted.value = true;
  await nextTick();
  await renderBarcode();
});

watch(
  [() => props.controlNumber, () => props.compact],
  async () => {
    if (!isMounted.value) {
      return;
    }

    await nextTick();
    await renderBarcode();
  },
  {
    flush: "post",
  },
);

defineExpose({
  createPngDataUrl,
  downloadPng,
  renderBarcode,
});
</script>

<template>
  <div
    class="overflow-hidden rounded-2xl border border-default bg-default shadow-sm"
  >
    <!-- Only this section is exported as PNG. -->
    <div
      ref="labelElement"
      class="bg-white p-5 text-black"
      :class="compact ? 'p-4' : 'p-5'"
    >
      <div class="text-center">
        <p
          class="font-bold tracking-wide text-slate-950"
          :class="compact ? 'text-sm' : 'text-base'"
        >
          {{ institutionName }}
        </p>

        <p
          v-if="title"
          class="mx-auto mt-1 max-w-md font-medium text-slate-800"
          :class="compact ? 'line-clamp-1 text-xs' : 'line-clamp-2 text-sm'"
        >
          {{ title }}
        </p>

        <p v-if="author && !compact" class="mt-0.5 text-xs text-slate-500">
          {{ author }}
        </p>

        <div
          class="mt-4 flex min-h-24 items-center justify-center overflow-hidden rounded-lg bg-white"
        >
          <div
            v-if="isRendering"
            class="flex items-center gap-2 text-sm text-slate-500"
          >
            <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
            Generating barcode
          </div>

          <svg
            ref="barcodeSvg"
            class="h-auto max-w-full"
            :class="{ hidden: isRendering || barcodeError }"
            role="img"
            :aria-label="`Barcode for ${normalizedControlNumber}`"
          />

          <div
            v-if="barcodeError"
            class="flex items-center gap-2 text-sm text-red-600"
          >
            <UIcon name="i-lucide-triangle-alert" class="size-5" />
            {{ barcodeError }}
          </div>
        </div>

        <div
          v-if="!compact"
          class="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-left text-xs"
        >
          <div>
            <p class="text-slate-500">Shelf</p>
            <p class="mt-0.5 font-semibold text-slate-900">
              {{ shelfLocation || "Not assigned" }}
            </p>
          </div>

          <div>
            <p class="text-slate-500">Condition</p>
            <p class="mt-0.5 font-semibold text-slate-900">
              {{ condition || "Not specified" }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- This action area is not included in the downloaded PNG. -->
    <div
      class="flex flex-col gap-3 border-t border-default bg-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0">
        <p class="truncate font-mono text-sm font-bold text-highlighted">
          {{ normalizedControlNumber || "No control number" }}
        </p>

        <div class="mt-1 flex items-center gap-2">
          <UBadge :color="statusColor" variant="soft" size="sm">
            {{ status }}
          </UBadge>

          <span v-if="shelfLocation" class="truncate text-xs text-muted">
            Shelf {{ shelfLocation }}
          </span>
        </div>
      </div>

      <UButton
        v-if="showDownload"
        label="Download PNG"
        icon="i-lucide-download"
        color="primary"
        variant="soft"
        :loading="isDownloading"
        :disabled="
          !normalizedControlNumber || Boolean(barcodeError) || isRendering
        "
        class="shrink-0 justify-center"
        @click="downloadPng"
      />
    </div>
  </div>
</template>
