<script setup lang="ts">
import {
  libraryReportDate,
  standardLibrarianChoices,
  type LibrarianExportChoice,
  type ReportPeriod,
} from "~/utils/librarian-export-choices";
import type { SimpleReportFormat } from "~/utils/download-simple-library-report";
import type { LibraryReportFilter } from "~/types/libraryReports";

const props = defineProps<{
  choices?: LibrarianExportChoice[];
  period?: Partial<ReportPeriod>;
  disabled?: boolean;
}>();

const route = useRoute();
const reports = useLibraryReports();
const settings = useLibrarySettings();
const libraryOptions = useLibraryOptions();
const open = ref(false);
const working = ref(false);
const error = ref("");
const selectedIndex = ref(0);
const format = ref<SimpleReportFormat>("pdf");
const selectedTerm = ref("current");
const range = reactive<ReportPeriod>({ from: "", to: "" });

const formatItems = [
  { label: "PDF", value: "pdf" },
  { label: "Excel (.xlsx)", value: "xlsx" },
  { label: "Word (.docx)", value: "docx" },
];

const choices = computed(() => [
  ...(props.choices ?? []),
  ...standardLibrarianChoices(
    route.path.replace(/^\/librarian\//, "").replace(/\/$/, ""),
    reports.generate,
    async () => {
      const { general } = await settings.load();
      return { academicYear: general.currentAcademicYear, semester: general.currentSemester };
    },
  ),
]);
const items = computed(() => choices.value.map((choice, index) => ({ label: choice.label, value: index })));
const selected = computed(() => choices.value[selectedIndex.value]);
const termItems = computed(() => [
  { label: "Current term", value: "current" },
  ...libraryOptions.academicTerms.value.map(term => ({
    label: `${term.semesterName} · ${term.academicYear}`,
    value: term.code,
  })),
]);

function prepare() {
  selectedIndex.value = 0;
  selectedTerm.value = "current";
  const today = libraryReportDate();
  const fromQuery = typeof route.query.dateFrom === "string" ? route.query.dateFrom : "";
  const toQuery = typeof route.query.dateTo === "string" ? route.query.dateTo : "";
  range.from = props.period?.from || fromQuery || `${today.slice(0, 7)}-01`;
  range.to = props.period?.to || toQuery || today;
  error.value = "";
}

watch(open, value => {
  if (value) prepare();
});

watch([open, selected], ([isOpen, choice]) => {
  if (isOpen && choice?.term) void libraryOptions.loadOperational().catch(() => undefined);
});

async function exportReport() {
  if (!selected.value || working.value) return;
  error.value = "";
  if (selected.value.dated && (!range.from || !range.to || range.from > range.to)) {
    error.value = "Enter a start date and end date in the correct order.";
    return;
  }

  working.value = true;
  try {
    const term = libraryOptions.academicTerms.value.find(item => item.code === selectedTerm.value);
    const termFilter: LibraryReportFilter | undefined = term
      ? { academicYear: term.academicYear, semester: term.semesterName }
      : undefined;
    const report = await selected.value.load({ ...range }, termFilter);
    const { downloadSimpleLibraryReport } = await import("~/utils/download-simple-library-report");
    await downloadSimpleLibraryReport(report, format.value);
    open.value = false;
  } catch {
    error.value = "The report could not be downloaded. Please try again.";
  } finally {
    working.value = false;
  }
}
</script>

<template>
  <UModal
    v-if="choices.length"
    v-model:open="open"
    title="Export report"
    description="Choose a report and a file format."
    :dismissible="!working"
    :close="!working"
    :ui="{ content: 'max-w-md' }"
  >
    <UButton
      label="Export report"
      leading-icon="i-lucide-download"
      color="neutral"
      variant="outline"
      :disabled="disabled"
    />

    <template #body>
      <form class="space-y-4" @submit.prevent="exportReport">
        <UFormField label="Report" name="librarianReport">
          <USelect v-if="choices.length > 1" v-model="selectedIndex" :items="items" class="w-full" :disabled="working" />
          <p v-else class="text-sm font-medium text-highlighted">{{ selected?.label }}</p>
        </UFormField>
        <p v-if="selected?.scope" class="text-sm text-muted">{{ selected.scope }}</p>
        <div v-if="selected?.dated" class="grid gap-3 sm:grid-cols-2">
          <UFormField label="From" name="reportFrom">
            <UInput v-model="range.from" type="date" class="w-full" required :disabled="working" />
          </UFormField>
          <UFormField label="To" name="reportTo">
            <UInput v-model="range.to" type="date" class="w-full" required :disabled="working" />
          </UFormField>
        </div>
        <UFormField v-if="selected?.term" label="Academic term" name="reportTerm">
          <USelect v-model="selectedTerm" :items="termItems" class="w-full" :disabled="working" />
        </UFormField>
        <UFormField label="Format" name="reportFormat">
          <USelect v-model="format" :items="formatItems" class="w-full" :disabled="working" />
        </UFormField>
        <p v-if="error" class="text-sm text-error" role="alert">{{ error }}</p>
        <div class="flex flex-wrap justify-end gap-2 border-t border-default pt-4">
          <UButton color="neutral" variant="ghost" label="Cancel" :disabled="working" @click="open = false" />
          <UButton type="submit" label="Download" leading-icon="i-lucide-download" :loading="working" />
        </div>
      </form>
    </template>
  </UModal>
</template>
