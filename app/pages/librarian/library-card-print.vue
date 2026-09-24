<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import type { StudentMember } from "~/composables/useLibraryMembers";
import StudentLibraryCard from "~/components/librarian/StudentLibraryCard.vue";

definePageMeta({
  layout: false,
  title: "Print Student Library Cards",
});

type PrintMode = "both" | "front" | "back";
type WorkflowStatus = "Printed" | "Released";

type CardComponentRef = ComponentPublicInstance & {
  renderBarcode?: () => Promise<void>;
};

const printQueue = useLibraryCardPrintQueue();
const designStore = useLibraryCardDesign();
const members = useLibraryMembers();
const auth = useAuth();
const toast = useToast();

const componentRefs = new Map<string, CardComponentRef>();

const printMode = ref<PrintMode>("both");
const mirrorBack = ref(true);
const preparing = ref(true);
const preparationError = ref("");
const printDialogOpened = ref(false);
const selectedStudentKeys = ref<string[]>([]);
const statusDialogOpen = ref(false);
const statusTarget = ref<WorkflowStatus>("Printed");
const statusUpdating = ref(false);

const modeItems = [
  { label: "Front and Back", value: "both" },
  { label: "Front Only", value: "front" },
  { label: "Back Only", value: "back" },
];

const students = computed(() => printQueue.students.value);
const activeDesign = computed(() => designStore.design.value);

function studentKey(student: StudentMember): string {
  return student.documentId || student.libraryCardNo || student.studentNo;
}

function cardStatusLabel(student: StudentMember): string {
  return student.libraryCardStatus || "Not started";
}

function cardStatusColor(status?: string | null) {
  if (status === "Released") return "success";
  if (status === "Printed") return "primary";
  if (status === "On Process") return "warning";
  return "neutral";
}

const onProcessCount = computed(
  () => students.value.filter((student) => student.libraryCardStatus === "On Process").length,
);
const printedCount = computed(
  () => students.value.filter((student) => student.libraryCardStatus === "Printed").length,
);
const releasedCount = computed(
  () => students.value.filter((student) => student.libraryCardStatus === "Released").length,
);

const selectedStudents = computed(() => {
  const selected = new Set(selectedStudentKeys.value);
  return students.value.filter((student) => selected.has(studentKey(student)));
});

const markPrintedCandidates = computed(() =>
  selectedStudents.value.filter((student) => student.libraryCardStatus === "On Process"),
);

const releaseCandidates = computed(() =>
  selectedStudents.value.filter((student) => student.libraryCardStatus === "Printed"),
);

const statusCandidates = computed(() =>
  statusTarget.value === "Printed" ? markPrintedCandidates.value : releaseCandidates.value,
);

const pages = computed(() => {
  const results: Array<Array<StudentMember | null>> = [];

  for (let start = 0; start < students.value.length; start += 8) {
    const page = students.value.slice(start, start + 8);
    results.push([
      ...page,
      ...Array<StudentMember | null>(Math.max(8 - page.length, 0)).fill(null),
    ]);
  }

  return results;
});

function backPageSlots(slots: Array<StudentMember | null>) {
  if (!mirrorBack.value) return slots;

  const mirrored: Array<StudentMember | null> = [];
  for (let index = 0; index < slots.length; index += 2) {
    mirrored.push(slots[index + 1] ?? null, slots[index] ?? null);
  }
  return mirrored;
}

function setCardRef(
  element: Element | ComponentPublicInstance | null,
  key: string,
) {
  if (element && typeof element === "object") {
    componentRefs.set(key, element as CardComponentRef);
  } else {
    componentRefs.delete(key);
  }
}

async function waitForImages() {
  if (!import.meta.client) return;

  const images = [...document.querySelectorAll<HTMLImageElement>(".print-sheet img")];
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

async function prepareCards() {
  if (!import.meta.client) return;

  preparing.value = true;
  preparationError.value = "";

  try {
    await designStore.loadDesign();
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await Promise.all(
      [...componentRefs.values()].map(async (component) => {
        await component.renderBarcode?.();
      }),
    );
    await waitForImages();
    if ("fonts" in document) await document.fonts.ready;
  } catch {
    preparationError.value =
      "The Library Cards could not be prepared. Refresh the page and try again.";
  } finally {
    preparing.value = false;
  }
}

function syncSelection() {
  const actionableKeys = new Set(
    students.value
      .filter((student) => student.libraryCardStatus !== "Released")
      .map(studentKey),
  );
  const preserved = selectedStudentKeys.value.filter((key) =>
    actionableKeys.has(key),
  );

  if (preserved.length > 0) {
    selectedStudentKeys.value = preserved;
    return;
  }

  selectedStudentKeys.value = [...actionableKeys];
}

function isSelected(student: StudentMember): boolean {
  return selectedStudentKeys.value.includes(studentKey(student));
}

function setSelected(student: StudentMember, selected: boolean) {
  const key = studentKey(student);
  const current = new Set(selectedStudentKeys.value);
  if (selected) current.add(key);
  else current.delete(key);
  selectedStudentKeys.value = [...current];
}

function selectActionableCards() {
  selectedStudentKeys.value = students.value
    .filter((student) =>
      student.libraryCardStatus === "On Process" ||
      student.libraryCardStatus === "Printed",
    )
    .map(studentKey);
}

function clearSelection() {
  selectedStudentKeys.value = [];
}

async function goBack() {
  await navigateTo(printQueue.sourceRoute.value || "/librarian/students");
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

  printDialogOpened.value = true;
  window.print();
}

function openStatusDialog(target: WorkflowStatus) {
  statusTarget.value = target;

  if (target === "Printed" && !printDialogOpened.value) {
    toast.add({
      title: "Print the cards first",
      description:
        "Open the print dialog and complete the physical printing before marking cards as Printed.",
      color: "warning",
      icon: "i-lucide-printer",
    });
    return;
  }

  if (statusCandidates.value.length === 0) {
    toast.add({
      title: target === "Printed" ? "No cards awaiting printing" : "No printed cards selected",
      description:
        target === "Printed"
          ? "Select at least one card with the On Process status."
          : "Select at least one card with the Printed status.",
      color: "warning",
      icon: "i-lucide-circle-alert",
    });
    return;
  }

  statusDialogOpen.value = true;
}

async function confirmStatusUpdate() {
  if (statusUpdating.value || statusCandidates.value.length === 0) return;

  statusUpdating.value = true;
  const candidates = [...statusCandidates.value];
  const updatedStudents: StudentMember[] = [];
  const failures: Array<{ student: StudentMember; message: string }> = [];

  for (const student of candidates) {
    try {
      const response = await members.updateStudent(student.documentId, {
        libraryCardStatus: statusTarget.value,
        ...(statusTarget.value === "Printed"
          ? { libraryCardReleaseDate: null }
          : {}),
      });
      updatedStudents.push(response.data);
    } catch (error) {
      failures.push({ student, message: auth.getErrorMessage(error) });
    }
  }

  if (updatedStudents.length > 0) {
    printQueue.replaceQueuedStudents(updatedStudents);
  }

  statusDialogOpen.value = false;
  statusUpdating.value = false;

  if (failures.length === 0) {
    toast.add({
      title:
        statusTarget.value === "Printed"
          ? "Library Cards marked as Printed"
          : "Library Cards released",
      description:
        statusTarget.value === "Printed"
          ? `${updatedStudents.length} card${updatedStudents.length === 1 ? " is" : "s are"} ready for final checking and release.`
          : `${updatedStudents.length} card${updatedStudents.length === 1 ? " release was" : " releases were"} recorded successfully.`,
      color: "success",
      icon:
        statusTarget.value === "Printed"
          ? "i-lucide-printer-check"
          : "i-lucide-handshake",
    });
    return;
  }

  toast.add({
    title: "Some card statuses were not updated",
    description: `${updatedStudents.length} updated and ${failures.length} need attention. ${failures[0]?.message ?? "Please try again."}`,
    color: "warning",
    icon: "i-lucide-triangle-alert",
  });
}

watch(
  [
    printMode,
    mirrorBack,
    () => students.value.map((student) => student.documentId),
  ],
  async () => {
    await nextTick();
    await prepareCards();
  },
  { deep: true },
);

watch(
  () => students.value.map((student) => `${studentKey(student)}:${student.libraryCardStatus}`),
  syncSelection,
  { deep: true },
);

onMounted(async () => {
  printQueue.restorePrintQueue();
  syncSelection();
  await prepareCards();
});
</script>

<template>
  <div class="print-page sncbt-staff-page sncbt-staff-print-page min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
    <header
      class="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
    >
      <div class="mx-auto flex max-w-[1500px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          <UButton
            label="Back"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="outline"
            @click="goBack"
          />

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="truncate text-lg font-bold text-slate-950 dark:text-white">
                Student Library Card Printing
              </h1>
              <UBadge label="Print and Release" color="primary" variant="soft" />
            </div>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ students.length }} {{ students.length === 1 ? "card" : "cards" }} queued · Standard CR80 size
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UButton
            label="Print Cards"
            icon="i-lucide-printer"
            color="primary"
            size="lg"
            :loading="preparing"
            :disabled="students.length === 0 || Boolean(preparationError)"
            @click="triggerPrint"
          />
          <UButton
            :label="`Mark Printed (${markPrintedCandidates.length})`"
            icon="i-lucide-printer-check"
            color="primary"
            variant="soft"
            size="lg"
            :disabled="markPrintedCandidates.length === 0 || !printDialogOpened"
            @click="openStatusDialog('Printed')"
          />
          <UButton
            :label="`Release Cards (${releaseCandidates.length})`"
            icon="i-lucide-handshake"
            color="primary"
            size="lg"
            :disabled="releaseCandidates.length === 0"
            @click="openStatusDialog('Released')"
          />
        </div>
      </div>
    </header>

    <main class="sncbt-staff-content mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <UAlert
        v-if="preparationError"
        class="no-print"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Unable to prepare the cards"
        :description="preparationError"
      />

      <section class="no-print grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">Card workflow</p>
              <h2 class="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                Print, verify, and release in one place
              </h2>
              <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Complete each step only after the physical action has been performed. This keeps the Student Portal and Librarian records accurate.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <UBadge :label="`${onProcessCount} On Process`" color="warning" variant="soft" />
              <UBadge :label="`${printedCount} Printed`" color="primary" variant="soft" />
              <UBadge :label="`${releasedCount} Released`" color="success" variant="soft" />
            </div>
          </div>

          <ol class="mt-5 grid gap-3 md:grid-cols-3">
            <li class="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div class="flex items-start gap-3">
                <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">1</div>
                <div>
                  <p class="font-semibold text-slate-950 dark:text-white">Print Cards</p>
                  <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Review the preview, choose the sides, then open the browser print dialog.
                  </p>
                </div>
              </div>
            </li>
            <li class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div class="flex items-start gap-3">
                <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-100">2</div>
                <div>
                  <p class="font-semibold text-slate-950 dark:text-white">Mark as Printed</p>
                  <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    After successful printing and visual checking, update the selected cards to Printed.
                  </p>
                </div>
              </div>
            </li>
            <li class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div class="flex items-start gap-3">
                <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-100">3</div>
                <div>
                  <p class="font-semibold text-slate-950 dark:text-white">Release to Student</p>
                  <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Mark a Printed card as Released only when the physical card is handed to the Student.
                  </p>
                </div>
              </div>
            </li>
          </ol>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-settings-2" class="size-5" />
            </div>
            <div>
              <h2 class="font-bold text-slate-950 dark:text-white">Print Settings</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Choose how the queued cards will be printed.</p>
            </div>
          </div>

          <div class="mt-4 space-y-4">
            <UFormField label="Print sides">
              <USelect v-model="printMode" :items="modeItems" value-key="value" class="w-full" />
            </UFormField>

            <label
              v-if="printMode === 'both'"
              class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/60"
            >
              <UCheckbox v-model="mirrorBack" aria-label="Mirror backs for duplex" class="mt-0.5" />
              <span>
                <span class="block font-semibold text-slate-800 dark:text-slate-100">Mirror backs for duplex</span>
                <span class="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Keep enabled for long-edge double-sided printing.
                </span>
              </span>
            </label>

            <UAlert
              color="info"
              variant="soft"
              icon="i-lucide-printer-check"
              title="Recommended settings"
              description="A4 paper · Portrait · Actual size or 100% · Browser headers and footers off."
            />
          </div>
        </div>
      </section>

      <section class="no-print overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="font-bold text-slate-950 dark:text-white">Cards selected for status update</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Printing always includes the complete queue. The checkboxes below control only which card statuses will be updated.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              label="Select On Process and Printed"
              icon="i-lucide-list-checks"
              color="neutral"
              variant="outline"
              size="sm"
              @click="selectActionableCards"
            />
            <UButton
              label="Clear Selection"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="clearSelection"
            />
          </div>
        </div>

        <div v-if="students.length" class="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          <label
            v-for="student in students"
            :key="studentKey(student)"
            class="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition"
            :class="
              isSelected(student)
                ? 'border-primary/50 bg-primary/5'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600'
            "
          >
            <UCheckbox
              :model-value="isSelected(student)"
              :aria-label="`Select ${student.fullName} for status update`"
              :disabled="student.libraryCardStatus === 'Released'"
              @update:model-value="setSelected(student, Boolean($event))"
            />
            <img
              v-if="student.photoUrl"
              :src="student.photoUrl"
              :alt="student.fullName"
              class="size-11 rounded-full border border-slate-200 object-cover dark:border-slate-700"
            >
            <div
              v-else
              class="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-100"
            >
              {{ student.firstName?.charAt(0) }}{{ student.lastName?.charAt(0) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-slate-950 dark:text-white">{{ student.fullName }}</p>
              <p class="mt-0.5 truncate font-mono text-xs text-slate-500 dark:text-slate-400">{{ student.libraryCardNo }}</p>
            </div>
            <UBadge :label="cardStatusLabel(student)" :color="cardStatusColor(student.libraryCardStatus)" variant="soft" />
          </label>
        </div>
      </section>

      <div
        v-if="preparing"
        class="no-print flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
      >
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
        Preparing Library Cards
      </div>

      <div
        v-if="!preparing && students.length === 0"
        class="no-print flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <UIcon name="i-lucide-id-card" class="size-7" />
        </div>
        <h2 class="mt-4 font-semibold text-slate-950 dark:text-white">No Library Cards queued</h2>
        <p class="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Select Print Card from the Student Library Members page.
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

      <section v-if="students.length && !preparing" class="preview-area rounded-2xl border border-slate-200 bg-slate-200/60 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900/70 sm:p-6">
        <div class="no-print mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="font-bold text-slate-950 dark:text-white">A4 Print Preview</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">The paper preview remains white in both themes to match the printed output.</p>
          </div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {{ pages.length }} front sheet{{ pages.length === 1 ? "" : "s" }}
          </p>
        </div>

        <div class="space-y-6 overflow-x-auto pb-2">
          <template v-for="(slots, pageIndex) in pages" :key="pageIndex">
            <section
              v-if="printMode === 'both' || printMode === 'front'"
              class="print-sheet"
              :aria-label="`Front cards page ${pageIndex + 1}`"
            >
              <div class="sheet-label no-print">Front Sheet {{ pageIndex + 1 }}</div>
              <div class="cards-grid">
                <article
                  v-for="(student, slotIndex) in slots"
                  :key="`front-${pageIndex}-${slotIndex}`"
                  class="card-slot"
                >
                  <div v-if="student" class="card-scale">
                    <StudentLibraryCard
                      :ref="(element) => setCardRef(element, `front-${pageIndex}-${slotIndex}`)"
                      :student="student"
                      :membership="student.membership"
                      :design="activeDesign"
                      :show-actions="false"
                      display-side="front"
                    />
                  </div>
                </article>
              </div>
            </section>

            <section
              v-if="printMode === 'both' || printMode === 'back'"
              class="print-sheet"
              :aria-label="`Back cards page ${pageIndex + 1}`"
            >
              <div class="sheet-label no-print">Back Sheet {{ pageIndex + 1 }}</div>
              <div class="cards-grid">
                <article
                  v-for="(student, slotIndex) in backPageSlots(slots)"
                  :key="`back-${pageIndex}-${slotIndex}`"
                  class="card-slot"
                >
                  <div v-if="student" class="card-scale">
                    <StudentLibraryCard
                      :ref="(element) => setCardRef(element, `back-${pageIndex}-${slotIndex}`)"
                      :student="student"
                      :membership="student.membership"
                      :design="activeDesign"
                      :show-actions="false"
                      display-side="back"
                    />
                  </div>
                </article>
              </div>
            </section>
          </template>
        </div>
      </section>
    </main>

    <UModal
      v-model:open="statusDialogOpen"
      :dismissible="!statusUpdating"
      :ui="{ content: 'sm:max-w-xl' }"
    >
      <template #content>
        <div class="space-y-5 p-6">
          <div class="flex items-start gap-3">
            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-xl"
              :class="statusTarget === 'Released' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'"
            >
              <UIcon
                :name="statusTarget === 'Released' ? 'i-lucide-handshake' : 'i-lucide-printer-check'"
                class="size-5"
              />
            </div>
            <div>
              <h2 class="text-xl font-bold text-highlighted">
                {{ statusTarget === "Released" ? "Release Library Cards" : "Mark Library Cards as Printed" }}
              </h2>
              <p class="mt-1 text-sm leading-6 text-muted">
                {{ statusTarget === "Released"
                  ? "Confirm only the cards that were physically handed to their Students."
                  : "Confirm that printing finished successfully and each physical card was checked." }}
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-default bg-elevated p-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted">Selected cards</p>
                <p class="mt-1 text-3xl font-black text-highlighted">{{ statusCandidates.length }}</p>
              </div>
              <UBadge
                :label="statusTarget"
                :color="statusTarget === 'Released' ? 'success' : 'primary'"
                variant="soft"
                size="lg"
              />
            </div>
            <div class="mt-4 max-h-48 space-y-2 overflow-y-auto pr-1">
              <div
                v-for="student in statusCandidates"
                :key="studentKey(student)"
                class="flex items-center justify-between gap-3 rounded-lg border border-default bg-default px-3 py-2"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-highlighted">{{ student.fullName }}</p>
                  <p class="font-mono text-xs text-muted">{{ student.libraryCardNo }}</p>
                </div>
                <UBadge :label="student.libraryCardStatus" :color="cardStatusColor(student.libraryCardStatus)" variant="soft" />
              </div>
            </div>
          </div>

          <UAlert
            :color="statusTarget === 'Released' ? 'success' : 'primary'"
            variant="soft"
            :icon="statusTarget === 'Released' ? 'i-lucide-calendar-check' : 'i-lucide-shield-check'"
            :title="statusTarget === 'Released' ? 'Release date will be recorded' : 'Status will move to Printed'"
            :description="statusTarget === 'Released'
              ? 'The current Philippine date will be saved for each released card.'
              : 'The next available action for these cards will be Release Cards.'"
          />

          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="statusUpdating"
              @click="() => { statusDialogOpen = false; }"
            />
            <UButton
              :label="statusTarget === 'Released' ? 'Confirm Release' : 'Confirm Printed'"
              :icon="statusTarget === 'Released' ? 'i-lucide-handshake' : 'i-lucide-printer-check'"
              :color="statusTarget === 'Released' ? 'success' : 'primary'"
              :loading="statusUpdating"
              @click="confirmStatusUpdate"
            />
          </div>
        </div>
      </template>
    </UModal>
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
  color: #0f172a;
  box-shadow: 0 18px 45px rgb(15 23 42 / 18%);
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
  grid-template-columns: repeat(2, 85.6mm);
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
  transform: scale(0.5775);
  transform-origin: top left;
}

.card-scale :deep(.library-card-pair) {
  display: block !important;
  width: 560px !important;
  gap: 0 !important;
}

.card-scale :deep(.library-card-shell) {
  width: 560px !important;
  min-width: 560px !important;
  max-width: 560px !important;
  height: 353.09px !important;
  aspect-ratio: auto !important;
  border-radius: 18px !important;
  box-shadow: none !important;
}

.card-scale :deep(.card-preview-viewport) {
  width: 560px !important;
  max-width: none !important;
  height: 353.09px !important;
  overflow: visible !important;
}

.card-scale :deep(.single-side-preview),
.card-scale :deep(.space-y-5) {
  width: 560px !important;
}

@media screen and (max-width: 900px) {
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
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }

  .no-print {
    display: none !important;
  }

  main,
  .preview-area,
  .preview-area > div {
    width: auto !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    background: #ffffff !important;
    box-shadow: none !important;
    overflow: visible !important;
  }

  .print-sheet {
    width: 210mm !important;
    min-height: 297mm !important;
    margin: 0 !important;
    padding: 10mm !important;
    box-shadow: none !important;
    break-after: page !important;
    page-break-after: always !important;
  }

  .print-sheet:last-child {
    break-after: auto !important;
    page-break-after: auto !important;
  }

  .card-slot,
  .card-scale,
  .card-scale :deep(.library-card-shell) {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
}
</style>
