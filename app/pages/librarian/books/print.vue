<script setup lang="ts">
import AppSkipLink from "~/components/shared/AppSkipLink.vue";
import AppDataSkeleton from "~/components/shared/AppDataSkeleton.vue";

import { appLogger } from "~/utils/app-logger";
import type {
  ComponentPublicInstance,
} from "vue";

definePageMeta({
  layout: false,
  title: "Print Barcode Labels",
});

const route = useRoute();
const printQueue =
  useBarcodePrintQueue();

const barcodeElements =
  new Map<number, SVGSVGElement>();

const isRendering = ref(false);
const renderError = ref("");

const printItems = computed(
  () => printQueue.items.value,
);

function setBarcodeRef(
  element:
    | Element
    | ComponentPublicInstance
    | null,
  index: number,
) {
  if (element instanceof SVGSVGElement) {
    barcodeElements.set(index, element);
  } else {
    barcodeElements.delete(index);
  }
}

function loadLegacyQuery() {
  if (
    printQueue.items.value.length > 0 ||
    typeof route.query.barcodes !==
      "string"
  ) {
    return;
  }

  const values = route.query.barcodes
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) {
    return;
  }

  printQueue.setPrintQueue(
    values.map((controlNumber) => ({
      controlNumber,
      title:
        typeof route.query.title ===
        "string"
          ? route.query.title
          : "Library Book",
      author:
        typeof route.query.author ===
        "string"
          ? route.query.author
          : "",
      shelfLocation:
        typeof route.query.shelf ===
        "string"
          ? route.query.shelf
          : "",
    })),
    "/librarian/books",
  );
}

async function renderBarcodes() {
  if (!import.meta.client) {
    return;
  }

  renderError.value = "";
  isRendering.value = true;

  try {
    await nextTick();

    const barcodeModule =
      await import("jsbarcode");

    const JsBarcode =
      barcodeModule.default;

    printItems.value.forEach(
      (item, index) => {
        const element =
          barcodeElements.get(index);

        if (!element) {
          return;
        }

        JsBarcode(
          element,
          item.controlNumber,
          {
            format: "CODE128",
            width: 1.6,
            height: 52,
            displayValue: true,
            font: "Arial",
            fontSize: 13,
            fontOptions: "bold",
            textMargin: 5,
            margin: 0,
            background: "#ffffff",
            lineColor: "#111827",
          },
        );
      },
    );
  } catch (error) {
    appLogger.error(
      "Unable to render print barcodes:",
      error,
    );

    renderError.value =
      "The barcode labels could not be generated. Return to the book record and try again.";
  } finally {
    isRendering.value = false;
  }
}

async function goBack() {
  await navigateTo(
    printQueue.sourceRoute.value ||
      "/librarian/books",
  );
}

function triggerPrint() {
  if (
    !import.meta.client ||
    printItems.value.length === 0 ||
    isRendering.value ||
    renderError.value
  ) {
    return;
  }

  window.print();
}

onMounted(async () => {
  printQueue.restorePrintQueue();
  loadLegacyQuery();
  await renderBarcodes();
});

watch(
  () =>
    printItems.value.map(
      (item) => item.controlNumber,
    ),
  async () => {
    await renderBarcodes();
  },
);
</script>

<template>
  <AppSkipLink class="no-print" />
  <div
    class="sncbt-staff-page sncbt-specialist-page sncbt-staff-print-page min-h-dvh bg-slate-100 text-slate-950"
  >
    <header
      class="no-print sncbt-print-toolbar sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3"
    >
      <div
        class="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-3">
          <UButton
            label="Back"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="outline"
            @click="goBack"
          />

          <div>
            <h1
              class="font-semibold text-slate-950"
            >
              Barcode Label Preview
            </h1>
            <p
              class="text-sm text-slate-500"
            >
              {{ printItems.length }}
              {{
                printItems.length === 1
                  ? "label"
                  : "labels"
              }}
              ready
            </p>
          </div>
        </div>

        <div class="sncbt-print-actions flex flex-wrap gap-2">
          <UButton
            label="Print Labels"
            icon="i-lucide-printer"
            color="primary"
            size="lg"
            :loading="isRendering"
            :disabled="
              printItems.length === 0 ||
              Boolean(renderError)
            "
            @click="triggerPrint"
          />
        </div>
      </div>
    </header>

    <main id="main-content" tabindex="-1" class="mx-auto max-w-7xl p-4 sm:p-6">
      <UAlert
        v-if="renderError"
        class="no-print mb-5"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Unable to prepare the labels"
        :description="renderError"
      />

      <AppDataSkeleton v-if="isRendering" class="no-print" variant="preview" :rows="3" label="Preparing barcode labels" />

      <div
        v-if="
          !isRendering &&
          printItems.length === 0
        "
        class="no-print flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center"
      >
        <div
          class="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
        >
          <UIcon
            name="i-lucide-scan-barcode"
            class="size-7"
          />
        </div>

        <h2
          class="mt-4 font-semibold text-slate-950"
        >
          No barcode labels selected
        </h2>

        <p
          class="mt-1 max-w-md text-sm text-slate-500"
        >
          Return to a book record or the physical
          copies directory and select the labels you
          want to print.
        </p>

        <UButton
          label="Back to Library Collection"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="outline"
          class="mt-5"
          @click="goBack"
        />
      </div>

      <section
        v-show="
          !isRendering &&
          printItems.length > 0
        "
        class="labels-grid"
        aria-label="Barcode labels"
      >
        <article
          v-for="(item, index) in printItems"
          :key="`${item.controlNumber}-${index}`"
          class="barcode-label border border-default"
        >
          <div class="barcode-area">
            <svg
              :ref="
                (element) =>
                  setBarcodeRef(
                    element,
                    index,
                  )
              "
              class="barcode-svg"
              role="img"
              :aria-label="`Barcode for ${item.controlNumber}`"
            />
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<style scoped>
.labels-grid {
  display: grid;
  grid-template-columns:
  repeat(auto-fit, minmax(min(100%, 310px), 1fr));
  gap: 16px;
}

.barcode-label {
  display: flex;
  min-height: 80px;
  break-inside: avoid;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 12px;
  background: #ffffff;
  padding: 14px;
  color: #0f172a;
  text-align: center;
}

.label-header {
  min-height: 54px;
}

.institution-name {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.book-title {
  margin-top: 4px;
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-author {
  margin-top: 2px;
  overflow: hidden;
  color: #64748b;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.barcode-area {
  display: flex;
  min-height: 84px;
  align-items: center;
  justify-content: center;
}

.barcode-svg {
  max-width: 100%;
  height: auto;
}

.label-footer {
  display: flex;
  min-height: 22px;
  align-items: flex-end;
  justify-content: center;
  border-top: 1px solid #e2e8f0;
  padding-top: 6px;
  color: #475569;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
}

@media print {
  @page {
    size: A4;
    margin: 10mm;
  }

  :global(html),
  :global(body) {
    margin: 0 !important;
    background: #ffffff !important;
  }

  .no-print {
    display: none !important;
  }

  main {
    width: auto !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .labels-grid {
    display: grid !important;
    grid-template-columns:
      repeat(2, minmax(0, 1fr)) !important;
    gap: 5mm !important;
  }

  .barcode-label {
    min-height: 1mm !important;
    border: 0.25mm solid #94a3b8 !important;
    border-radius: 1mm !important;
    padding: 0.1mm !important;
    box-shadow: none !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
</style>
