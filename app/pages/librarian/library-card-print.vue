
<script setup lang="ts">
import type {
  ComponentPublicInstance,
} from "vue";
import type {
  StudentMember,
} from "~/composables/useLibraryMembers";
import StudentLibraryCard from "~/components/librarian/StudentLibraryCard.vue";

definePageMeta({
  layout: false,
  title:
    "Print Student Library Cards",
});

type PrintMode =
  | "both"
  | "front"
  | "back";

type CardComponentRef =
  ComponentPublicInstance & {
    renderBarcode?: () =>
      Promise<void>;
  };

const printQueue =
  useLibraryCardPrintQueue();
const designStore =
  useLibraryCardDesign();

const componentRefs =
  new Map<
    string,
    CardComponentRef
  >();

const printMode =
  ref<PrintMode>("both");
const mirrorBack =
  ref(true);
const preparing =
  ref(true);
const preparationError =
  ref("");

const modeItems = [
  {
    label:
      "Front and Back",
    value: "both",
  },
  {
    label: "Front Only",
    value: "front",
  },
  {
    label: "Back Only",
    value: "back",
  },
];

const students = computed(
  () => printQueue.students.value,
);

const activeDesign = computed(
  () => designStore.design.value,
);

const pages = computed(() => {
  const results:
    Array<Array<StudentMember | null>> =
      [];

  for (
    let start = 0;
    start < students.value.length;
    start += 8
  ) {
    const page =
      students.value.slice(
        start,
        start + 8,
      );

    results.push([
      ...page,
      ...Array<
        StudentMember | null
      >(
        Math.max(
          8 - page.length,
          0,
        ),
      ).fill(null),
    ]);
  }

  return results;
});

function backPageSlots(
  slots:
    Array<StudentMember | null>,
) {
  if (!mirrorBack.value) {
    return slots;
  }

  const mirrored:
    Array<StudentMember | null> =
      [];

  for (
    let index = 0;
    index < slots.length;
    index += 2
  ) {
    mirrored.push(
      slots[index + 1] ??
        null,
      slots[index] ?? null,
    );
  }

  return mirrored;
}

function setCardRef(
  element:
    | Element
    | ComponentPublicInstance
    | null,
  key: string,
) {
  if (
    element &&
    typeof element === "object"
  ) {
    componentRefs.set(
      key,
      element as CardComponentRef,
    );
  } else {
    componentRefs.delete(key);
  }
}

async function waitForImages() {
  if (!import.meta.client) {
    return;
  }

  const images = [
    ...document.querySelectorAll<
      HTMLImageElement
    >(
      ".print-sheet img",
    ),
  ];

  await Promise.all(
    images.map((image) => {
      if (image.complete) {
        return Promise.resolve();
      }

      return new Promise<void>(
        (resolve) => {
          image.addEventListener(
            "load",
            () => resolve(),
            {
              once: true,
            },
          );

          image.addEventListener(
            "error",
            () => resolve(),
            {
              once: true,
            },
          );
        },
      );
    }),
  );
}

async function prepareCards() {
  if (!import.meta.client) {
    return;
  }

  preparing.value = true;
  preparationError.value = "";

  try {
    await designStore.loadDesign();
    await nextTick();

    await new Promise<void>(
      (resolve) => {
        requestAnimationFrame(
          () => resolve(),
        );
      },
    );

    await Promise.all(
      [
        ...componentRefs.values(),
      ].map(
        async (component) => {
          await component.renderBarcode?.();
        },
      ),
    );

    await waitForImages();

    if (
      "fonts" in document
    ) {
      await document.fonts.ready;
    }
  } catch (error) {
    console.error(
      "Unable to prepare Library Cards:",
      error,
    );

    preparationError.value =
      error instanceof Error
        ? error.message
        : "The Library Cards could not be prepared.";
  } finally {
    preparing.value = false;
  }
}

async function goBack() {
  await navigateTo(
    printQueue.sourceRoute.value ||
      "/librarian/students",
  );
}

function triggerPrint() {
  if (
    !import.meta.client ||
    students.value.length === 0 ||
    preparing.value ||
    preparationError.value
  ) {
    return;
  }

  window.print();
}

watch(
  [
    printMode,
    mirrorBack,
    () =>
      students.value.map(
        (student) =>
          student.documentId,
      ),
  ],
  async () => {
    await nextTick();
    await prepareCards();
  },
  {
    deep: true,
  },
);

onMounted(async () => {
  printQueue.restorePrintQueue();
  await prepareCards();
});
</script>

<template>
  <div
    class="print-page min-h-screen bg-slate-100 text-slate-950"
  >
    <header
      class="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur"
    >
      <div
        class="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div
          class="flex items-center gap-3"
        >
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
              Student Library Card
              Print Preview
            </h1>

            <p
              class="text-sm text-slate-500"
            >
              {{ students.length }}
              {{
                students.length === 1
                  ? "card"
                  : "cards"
              }}
              queued · Standard
              CR80 size
            </p>
          </div>
        </div>

        <div
          class="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <UFormField
            label="Print Sides"
            class="min-w-48"
          >
            <USelect
              v-model="printMode"
              :items="modeItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <label
            v-if="
              printMode === 'both'
            "
            class="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700"
          >
            <UCheckbox
              v-model="mirrorBack"
            />
            Mirror backs for duplex
          </label>

          <UButton
            label="Print Cards"
            icon="i-lucide-printer"
            color="primary"
            size="lg"
            :loading="preparing"
            :disabled="
              students.length === 0 ||
              Boolean(
                preparationError,
              )
            "
            @click="triggerPrint"
          />
        </div>
      </div>
    </header>

    <main
      class="mx-auto max-w-7xl space-y-5 p-4 sm:p-6"
    >
      <UAlert
        v-if="preparationError"
        class="no-print"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Unable to prepare the cards"
        :description="
          preparationError
        "
      />

      <UAlert
        v-else
        class="no-print"
        color="info"
        variant="soft"
        icon="i-lucide-printer-check"
        title="Recommended print settings"
        description="Use A4 paper, Portrait orientation, Actual size or 100% scale, and disable browser headers and footers. For front-and-back printing, enable duplex printing on the long edge."
      />

      <div
        v-if="preparing"
        class="no-print flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-slate-500"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin"
        />
        Preparing Library Cards
      </div>

      <div
        v-if="
          !preparing &&
          students.length === 0
        "
        class="no-print flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center"
      >
        <div
          class="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
        >
          <UIcon
            name="i-lucide-id-card"
            class="size-7"
          />
        </div>

        <h2
          class="mt-4 font-semibold text-slate-950"
        >
          No Library Cards queued
        </h2>

        <p
          class="mt-1 max-w-md text-sm text-slate-500"
        >
          Register a Student or
          select Print Card from the
          Student directory.
        </p>

        <UButton
          label="Back to Students"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="outline"
          class="mt-5"
          @click="goBack"
        />
      </div>

      <template
        v-for="(
          slots,
          pageIndex
        ) in pages"
        :key="pageIndex"
      >
        <section
          v-if="
            printMode === 'both' ||
            printMode === 'front'
          "
          class="print-sheet"
          :aria-label="`Front cards page ${pageIndex + 1}`"
        >
          <div
            class="sheet-label no-print"
          >
            Front Sheet
            {{ pageIndex + 1 }}
          </div>

          <div
            class="cards-grid"
          >
            <article
              v-for="(
                student,
                slotIndex
              ) in slots"
              :key="`front-${pageIndex}-${slotIndex}`"
              class="card-slot"
            >
              <div
                v-if="student"
                class="card-scale"
              >
                <StudentLibraryCard
                  :ref="
                    (element) =>
                      setCardRef(
                        element,
                        `front-${pageIndex}-${slotIndex}`,
                      )
                  "
                  :student="student"
                  :membership="
                    student.membership
                  "
                  :design="
                    activeDesign
                  "
                  :show-actions="false"
                  display-side="front"
                />
              </div>
            </article>
          </div>
        </section>

        <section
          v-if="
            printMode === 'both' ||
            printMode === 'back'
          "
          class="print-sheet"
          :aria-label="`Back cards page ${pageIndex + 1}`"
        >
          <div
            class="sheet-label no-print"
          >
            Back Sheet
            {{ pageIndex + 1 }}
          </div>

          <div
            class="cards-grid"
          >
            <article
              v-for="(
                student,
                slotIndex
              ) in backPageSlots(
                slots,
              )"
              :key="`back-${pageIndex}-${slotIndex}`"
              class="card-slot"
            >
              <div
                v-if="student"
                class="card-scale"
              >
                <StudentLibraryCard
                  :ref="
                    (element) =>
                      setCardRef(
                        element,
                        `back-${pageIndex}-${slotIndex}`,
                      )
                  "
                  :student="student"
                  :membership="
                    student.membership
                  "
                  :design="
                    activeDesign
                  "
                  :show-actions="false"
                  display-side="back"
                />
              </div>
            </article>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.print-sheet {
  position: relative;
  width: 210mm;
  min-height: 297mm;
  margin-inline: auto;
  overflow: hidden;
  background: #ffffff;
  padding: 10mm;
  box-shadow:
    0 18px 45px
      rgb(15 23 42 / 15%);
}

.sheet-label {
  position: absolute;
  top: 3mm;
  right: 10mm;
  border-radius: 9999px;
  background: #e2e8f0;
  padding: 1mm 3mm;
  color: #475569;
  font-size: 10px;
  font-weight: 700;
}

.cards-grid {
  display: grid;
  grid-template-columns:
    repeat(
      2,
      85.6mm
    );
  grid-auto-rows: 53.98mm;
  justify-content: center;
  gap: 5mm;
}

.card-slot {
  position: relative;
  width: 85.6mm;
  height: 53.98mm;
  overflow: hidden;
}

.card-scale {
  width: 560px;
  height: 353.09px;
  transform:
    scale(0.5775);
  transform-origin:
    top left;
}

/*
 * StudentLibraryCard is designed at 560 px.
 * It is scaled as one completed design to
 * the standard CR80 physical size:
 * 85.60 mm × 53.98 mm.
 */
.card-scale
  :deep(.library-card-pair) {
  display: block !important;
  width: 560px !important;
  gap: 0 !important;
}

.card-scale
  :deep(.library-card-shell) {
  width: 560px !important;
  min-width: 560px !important;
  max-width: 560px !important;
  height: 353.09px !important;
  aspect-ratio: auto !important;
  border-radius: 18px !important;
  box-shadow: none !important;
}

.card-scale
  :deep(.card-preview-viewport) {
  width: 560px !important;
  max-width: none !important;
  height: 353.09px !important;
  overflow: visible !important;
}

.card-scale
  :deep(.single-side-preview) {
  width: 560px !important;
}

.card-scale
  :deep(.space-y-5) {
  width: 560px !important;
}

@media screen and
  (max-width: 900px) {
  main {
    overflow-x: auto;
  }

  .print-sheet {
    margin-left: 0;
  }
}

@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }

  :global(html),
  :global(body) {
    margin: 0 !important;
    background: #ffffff !important;
  }

  :global(body) {
    print-color-adjust:
      exact !important;
    -webkit-print-color-adjust:
      exact !important;
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

  .print-sheet {
    width: 210mm !important;
    min-height: 297mm !important;
    margin: 0 !important;
    padding: 10mm !important;
    box-shadow: none !important;
    break-after: page !important;
    page-break-after:
      always !important;
  }

  .print-sheet:last-child {
    break-after:
      auto !important;
    page-break-after:
      auto !important;
  }

  .card-slot,
  .card-scale,
  .card-scale
    :deep(.library-card-shell) {
    break-inside:
      avoid !important;
    page-break-inside:
      avoid !important;
  }
}
</style>
