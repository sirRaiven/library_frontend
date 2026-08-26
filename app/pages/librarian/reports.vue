<script setup lang="ts">

import { userFacingErrorMessage } from "~/utils/user-facing-error";
import type {
  LibraryReportBranding,
  LibraryReportDocument,
  LibraryReportFilter,
  LibraryReportKey,
  LibraryReportMetric,
  LibraryReportTable,
  ReportCellFormat,
} from "~/types/libraryReports";

definePageMeta({
  layout: "librarian",
  title: "Library Reports",
});

type StandardReportKey = Exclude<LibraryReportKey, "custom-summary">;
type ExportFormat = "pdf" | "docx" | "xlsx";

type ReportGroupKey =
  | "statistics"
  | "members"
  | "collection"
  | "circulation"
  | "detailed";

interface ReportDefinition {
  key: StandardReportKey;
  label: string;
  description: string;
  icon: string;
  group: ReportGroupKey;
  periodHint: string;
  combined?: boolean;
}

interface ReportGroup {
  key: ReportGroupKey;
  label: string;
  description: string;
  icon: string;
}

interface ReportSectionCustomization {
  id: string;
  included: boolean;
  title: string;
  description: string;
}

const reportApi = useLibraryReports();
const reportExport = useLibraryReportExport();
const auth = useAuth();
const toast = useToast();

const REPORT_GROUPS: ReportGroup[] = [
  {
    key: "statistics",
    label: "Library Statistics",
    description: "Overall Library performance and visitor attendance.",
    icon: "i-lucide-chart-no-axes-combined",
  },
  {
    key: "members",
    label: "Students and Membership",
    description: "Registered Students, renewals, Library Cards, and Faculty.",
    icon: "i-lucide-users-round",
  },
  {
    key: "collection",
    label: "Books and Collection",
    description: "Registered titles, copies, Shelf Locations, and popular books.",
    icon: "i-lucide-library-big",
  },
  {
    key: "circulation",
    label: "Borrowing, Returns, and Fines",
    description: "Weekly and monthly circulation statistics and follow-up lists.",
    icon: "i-lucide-repeat-2",
  },
  {
    key: "detailed",
    label: "Detailed Registers",
    description: "Complete record-by-record reports for official checking.",
    icon: "i-lucide-notebook-tabs",
  },
];

const REPORTS: ReportDefinition[] = [
  {
    key: "executive-summary",
    label: "Overall Library Summary",
    description:
      "A one-report overview of Students, memberships, books, visitors, borrowing, returns, reservations, overdue books, and fines.",
    icon: "i-lucide-layout-dashboard",
    group: "statistics",
    periodHint: "Uses the selected date range and academic term.",
    combined: true,
  },
  {
    key: "visitor-summary",
    label: "Visitor Statistics",
    description:
      "Visitor logs by program and year level, with daily, weekly, monthly, Student, Faculty, and whole totals.",
    icon: "i-lucide-door-open",
    group: "statistics",
    periodHint: "Uses the selected date range.",
    combined: true,
  },
  {
    key: "membership-statistics",
    label: "Membership Renewal Status",
    description:
      "Total registered Student members, active memberships, not yet renewed, expired, and pending verification.",
    icon: "i-lucide-id-card",
    group: "members",
    periodHint: "Uses the selected academic year and semester.",
    combined: true,
  },
  {
    key: "membership-registry",
    label: "Student Member List",
    description:
      "Complete Student membership and Library Card register with current term status.",
    icon: "i-lucide-graduation-cap",
    group: "members",
    periodHint: "Uses the selected academic year and semester.",
  },
  {
    key: "faculty-registry",
    label: "Faculty Library User List",
    description: "Complete list of Faculty users registered in the Library.",
    icon: "i-lucide-briefcase-business",
    group: "members",
    periodHint: "Current Faculty registry snapshot.",
  },
  {
    key: "inventory-summary",
    label: "Books Registered and Collection Summary",
    description:
      "Total book titles and physical copies, Shelf Locations, Dewey ranges, availability, condition, and collection value.",
    icon: "i-lucide-books",
    group: "collection",
    periodHint: "Current collection snapshot.",
    combined: true,
  },
  {
    key: "inventory-detail",
    label: "Complete Book Inventory",
    description:
      "One row for every physical copy, including accession number, Call Number, Shelf Location, condition, and price.",
    icon: "i-lucide-list-tree",
    group: "collection",
    periodHint: "Current collection snapshot.",
  },
  {
    key: "popular-books",
    label: "Most Borrowed Books",
    description: "Ranks the most frequently borrowed book titles in the selected period.",
    icon: "i-lucide-trophy",
    group: "collection",
    periodHint: "Uses the selected date range.",
    combined: true,
  },
  {
    key: "borrowing-summary",
    label: "Book Borrowing Statistics",
    description:
      "Total books borrowed every day, week, and month, with Student, Faculty, program, and Shelf Location totals.",
    icon: "i-lucide-book-up-2",
    group: "circulation",
    periodHint: "Uses the selected date range.",
    combined: true,
  },
  {
    key: "return-summary",
    label: "Book Return Statistics",
    description:
      "Total books returned every day, week, and month, including condition and assessed fines.",
    icon: "i-lucide-book-down",
    group: "circulation",
    periodHint: "Uses the selected date range.",
    combined: true,
  },
  {
    key: "overdue-outstanding",
    label: "Books Still Out or Overdue",
    description: "Borrowers and books that still need return or follow-up.",
    icon: "i-lucide-clock-alert",
    group: "circulation",
    periodHint: "Current outstanding-loan snapshot.",
    combined: true,
  },
  {
    key: "fines-penalties",
    label: "Fines and Penalties List",
    description: "Detailed list of assessed fines, damaged books, and lost-book penalties.",
    icon: "i-lucide-philippine-peso",
    group: "circulation",
    periodHint: "Uses the selected date range.",
    combined: true,
  },
  {
    key: "reservations",
    label: "Reservation Status Report",
    description: "Pending, approved, ready-for-pickup, completed, cancelled, and expired reservations.",
    icon: "i-lucide-calendar-clock",
    group: "circulation",
    periodHint: "Uses the selected date range.",
    combined: true,
  },
  {
    key: "borrowing-transactions",
    label: "Detailed Borrowing Register",
    description: "One row for every borrowing transaction and physical copy.",
    icon: "i-lucide-clipboard-list",
    group: "detailed",
    periodHint: "Uses the selected date range.",
  },
  {
    key: "return-transactions",
    label: "Detailed Return Register",
    description: "One row for every completed book return.",
    icon: "i-lucide-list-checks",
    group: "detailed",
    periodHint: "Uses the selected date range.",
  },
  {
    key: "visitor-log",
    label: "Detailed Visitor Log",
    description: "Every accepted Student Library Card or Faculty ID time-in record.",
    icon: "i-lucide-logs",
    group: "detailed",
    periodHint: "Uses the selected date range.",
  },
  {
    key: "member-activity",
    label: "Student and Faculty Library Use",
    description: "Compares visits, borrowing, active loans, overdue books, and returns by member.",
    icon: "i-lucide-user-round-search",
    group: "detailed",
    periodHint: "Uses the selected date range.",
  },
];

const filters = reactive<LibraryReportFilter>({
  from: monthStart(),
  to: today(),
  academicYear: defaultAcademicYear(),
  semester: "First Semester",
});

const branding = reactive<LibraryReportBranding>({
  schoolName: "St. Nicolas College of Business and Technology",
  officeName: "LIBRARY DEPARTMENT",
  address: "2nd Flr. Mel-Vi Bldg., JASA Road\nCity of San Fernando, Pampanga",
  institutionLogoUrl: "/sncbt-logo.png",
  libraryLogoUrl: "/sncbt-library-logo.png",
  preparedBy: "SNCBT Librarian",
  signatoryName: "",
  signatoryTitle: "Authorized Librarian",
});

const activeReport = ref<LibraryReportDocument | null>(null);
const activeReportKey = ref<StandardReportKey>("executive-summary");
const loadingKey = ref<StandardReportKey | "combined" | null>(null);
const exportingFormat = ref<ExportFormat | null>(null);
const isPrinting = ref(false);
const brandingOpen = ref(false);
const reportCustomizationOpen = ref(false);

const reportCustomization = reactive({
  title: "",
  description: "",
  includeNotes: false,
  notesText: "",
  sections: [] as ReportSectionCustomization[],
});

const combinedTitle = ref("Consolidated Library Report");
const combinedPurpose = ref(
  "Prepared for official Library monitoring, administrative review, and institutional records.",
);
const combinedSelections = ref<StandardReportKey[]>([
  "visitor-summary",
  "membership-statistics",
  "inventory-summary",
  "borrowing-summary",
  "return-summary",
]);

const semesterItems = ["First Semester", "Second Semester", "Summer"];
const academicYearItems = computed(() => {
  const current = new Date().getFullYear();

  return Array.from({ length: 9 }, (_, index) => {
    const start = current - 4 + index;
    return `${start}-${start + 1}`;
  });
});

const groupedReports = computed(() =>
  REPORT_GROUPS.map((group) => ({
    ...group,
    reports: REPORTS.filter((report) => report.group === group.key),
  })),
);

const combinedOptions = computed(() => REPORTS.filter((report) => report.combined));
const selectedDefinition = computed(
  () => REPORTS.find((report) => report.key === activeReportKey.value) ?? REPORTS[0]!,
);

const includedSectionCount = computed(() =>
  reportCustomization.sections.filter((section) => section.included).length,
);

const customizedReport = computed<LibraryReportDocument | null>(() => {
  const report = activeReport.value;

  if (!report) {
    return null;
  }

  const sectionSettings = new Map(
    reportCustomization.sections.map((section) => [section.id, section]),
  );

  const tables = report.tables
    .filter((table) => sectionSettings.get(table.id)?.included !== false)
    .map((table) => {
      const setting = sectionSettings.get(table.id);
      const description = setting?.description.trim();

      return {
        ...table,
        title: setting?.title.trim() || cleanTableTitle(table.title),
        description: description || undefined,
      };
    });

  const notes = reportCustomization.includeNotes
    ? reportCustomization.notesText
        .split(/\r?\n/)
        .map((note) => note.trim())
        .filter(Boolean)
    : [];

  return {
    ...report,
    title: reportCustomization.title.trim() || report.title,
    description: reportCustomization.description.trim() || report.description,
    tables,
    notes: notes.length ? notes : undefined,
  };
});

function dateInput(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function today(): string {
  return dateInput(new Date());
}

function monthStart(): string {
  const now = new Date();
  return dateInput(new Date(now.getFullYear(), now.getMonth(), 1));
}

function weekStart(): string {
  const now = new Date();
  const offset = (now.getDay() + 6) % 7;
  return dateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset));
}

function yearStart(): string {
  const now = new Date();
  return dateInput(new Date(now.getFullYear(), 0, 1));
}

function defaultAcademicYear(): string {
  const now = new Date();
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

function setPeriod(preset: "today" | "week" | "month" | "year" | "all") {
  if (preset === "today") {
    filters.from = today();
    filters.to = today();
    return;
  }

  if (preset === "week") {
    filters.from = weekStart();
    filters.to = today();
    return;
  }

  if (preset === "month") {
    filters.from = monthStart();
    filters.to = today();
    return;
  }

  if (preset === "year") {
    filters.from = yearStart();
    filters.to = today();
    return;
  }

  filters.from = undefined;
  filters.to = undefined;
}

function validatePeriod(): boolean {
  if (filters.from && filters.to && filters.from > filters.to) {
    toast.add({
      title: "Check the reporting period",
      description: "The start date cannot be later than the end date.",
      color: "warning",
      icon: "i-lucide-calendar-alert",
    });
    return false;
  }

  return true;
}

function errorMessage(error: unknown): string {
  return userFacingErrorMessage(
    error,
    "The report could not be prepared.",
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanTableTitle(title: string, sourceLabel?: string): string {
  let cleaned = title.trim();
  const prefixes = [
    sourceLabel,
    ...REPORTS.map((report) => report.label),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .sort((a, b) => b.length - a.length);

  for (let pass = 0; pass < 3; pass += 1) {
    const previous = cleaned;

    for (const prefix of prefixes) {
      cleaned = cleaned.replace(
        new RegExp(`^${escapeRegExp(prefix)}\\s*(?:—|–|-|:)\\s*`, "i"),
        "",
      );
    }

    if (cleaned === previous) {
      break;
    }
  }

  return cleaned || title.trim() || "Report Table";
}

function resetReportCustomization(report: LibraryReportDocument) {
  reportCustomization.title = report.title;
  reportCustomization.description = report.description;
  reportCustomization.includeNotes = Boolean(report.notes?.length);
  reportCustomization.notesText = (report.notes ?? []).join("\n");
  reportCustomization.sections = report.tables.map((table) => ({
    id: table.id,
    included: true,
    title: cleanTableTitle(table.title),
    description: table.description ?? "",
  }));
}

function openReportCustomization() {
  if (!activeReport.value) {
    return;
  }

  reportCustomizationOpen.value = true;
}

function includeAllReportSections(included: boolean) {
  reportCustomization.sections.forEach((section) => {
    section.included = included;
  });
}

function restoreReportDefaults() {
  if (!activeReport.value) {
    return;
  }

  resetReportCustomization(activeReport.value);
  toast.add({
    title: "Report settings restored",
    description: "The original report name, notes, and section selections were restored.",
    color: "success",
    icon: "i-lucide-rotate-ccw",
  });
}

function preparedReportForOutput(): LibraryReportDocument | null {
  const report = customizedReport.value;

  if (!report) {
    return null;
  }

  if (report.tables.length === 0) {
    toast.add({
      title: "Include at least one report section",
      description: "Open Customize Report and mark at least one table as included.",
      color: "warning",
      icon: "i-lucide-list-checks",
    });
    return null;
  }

  return report;
}

async function generateReport(key: StandardReportKey) {
  if (!validatePeriod()) {
    return;
  }

  activeReportKey.value = key;
  loadingKey.value = key;

  try {
    activeReport.value = await reportApi.generate(key, filters);
    resetReportCustomization(activeReport.value);

    await nextTick();
    document.getElementById("report-preview")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  } catch (error) {
    toast.add({
      title: "Unable to generate report",
      description: errorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loadingKey.value = null;
  }
}

function toggleCombined(key: StandardReportKey) {
  combinedSelections.value = combinedSelections.value.includes(key)
    ? combinedSelections.value.filter((item) => item !== key)
    : [...combinedSelections.value, key];
}

function combinedMetric(
  _reportLabel: string,
  metric: LibraryReportMetric,
): LibraryReportMetric {
  return { ...metric };
}

function combinedTable(
  reportLabel: string,
  table: LibraryReportTable,
): LibraryReportTable {
  return {
    ...table,
    id: `${reportLabel}-${table.id}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: cleanTableTitle(table.title, reportLabel),
  };
}

async function generateCombinedReport() {
  if (!validatePeriod()) {
    return;
  }

  if (combinedSelections.value.length === 0) {
    toast.add({
      title: "Select at least one report area",
      description: "Choose the Library information to include in the combined report.",
      color: "warning",
      icon: "i-lucide-list-checks",
    });
    return;
  }

  loadingKey.value = "combined";

  try {
    const documents = await Promise.all(
      combinedSelections.value.map(async (key) => ({
        definition: REPORTS.find((item) => item.key === key)!,
        report: await reportApi.generate(key, filters),
      })),
    );

    activeReport.value = {
      type: "custom-summary",
      title: combinedTitle.value.trim() || "Consolidated Library Report",
      description:
        combinedPurpose.value.trim() ||
        "Prepared for official Library monitoring and institutional records.",
      category: "Administration",
      generatedAt: new Date().toISOString(),
      periodLabel: documents[0]?.report.periodLabel ?? "Selected reporting period",
      filters: { ...filters },
      metrics: documents.flatMap(({ definition, report }) =>
        report.metrics.slice(0, 5).map((metric) => combinedMetric(definition.label, metric)),
      ),
      tables: documents.flatMap(({ definition, report }) =>
        report.tables.map((table) => combinedTable(definition.label, table)),
      ),
      notes: [
        "This combined report was generated from the selected individual Library reports.",
        "Detailed transaction registers can be generated separately from the official report cards.",
      ],
    };
    resetReportCustomization(activeReport.value);

    await nextTick();
    document.getElementById("report-preview")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  } catch (error) {
    toast.add({
      title: "Unable to generate combined report",
      description: errorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loadingKey.value = null;
  }
}

function formatCell(value: unknown, format?: ReportCellFormat): string {
  return reportExport.formatValue(value, format) || "—";
}

async function exportActive(format: ExportFormat) {
  const report = preparedReportForOutput();

  if (!report) {
    return;
  }

  exportingFormat.value = format;

  try {
    await reportExport.exportReport(format, report, branding);
  } catch (error) {
    toast.add({
      title: "Unable to export report",
      description: errorMessage(error),
      color: "error",
      icon: "i-lucide-file-warning",
    });
  } finally {
    exportingFormat.value = null;
  }
}

async function printActive() {
  const report = preparedReportForOutput();

  if (!report) {
    return;
  }

  isPrinting.value = true;

  try {
    await reportExport.previewAndPrint(report, branding);
  } catch (error) {
    toast.add({
      title: "Unable to open print preview",
      description: errorMessage(error),
      color: "error",
      icon: "i-lucide-printer-check",
    });
  } finally {
    isPrinting.value = false;
  }
}

function saveBranding() {
  if (import.meta.client) {
    localStorage.setItem("sncbt-report-branding", JSON.stringify(branding));
  }

  brandingOpen.value = false;
  toast.add({
    title: "Report header saved",
    description: "The updated official header will be used in printed and exported reports.",
    color: "success",
    icon: "i-lucide-badge-check",
  });
}

function loadBranding() {
  if (!import.meta.client) {
    return;
  }

  const stored = localStorage.getItem("sncbt-report-branding");

  if (stored) {
    try {
      Object.assign(branding, JSON.parse(stored));
    } catch {
      localStorage.removeItem("sncbt-report-branding");
    }
  }

  if (!branding.preparedBy || branding.preparedBy === "SNCBT Librarian") {
    const username = auth.user.value?.username;
    if (username) {
      branding.preparedBy = username;
    }
  }
}

function metricTone(tone?: LibraryReportMetric["tone"]) {
  const tones: Record<string, string> = {
    success: "border-success/25 bg-success/5",
    warning: "border-warning/25 bg-warning/5",
    error: "border-error/25 bg-error/5",
    info: "border-info/25 bg-info/5",
    primary: "border-primary/25 bg-primary/5",
    neutral: "border-default bg-elevated/30",
  };

  return tones[tone ?? "neutral"] ?? tones.neutral;
}

onMounted(async () => {
  loadBranding();
  await generateReport("executive-summary");
});
</script>

<template>
  <UContainer class="space-y-6 py-6 sm:py-8">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="flex items-start gap-4">
        <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UIcon name="i-lucide-file-chart-column-increasing" class="size-6" />
        </div>

        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Library Records and Statistics
          </p>
          <h1 class="mt-1 text-3xl font-bold text-highlighted">Library Reports</h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Choose an understandable report, select the reporting period, review the result, and export it to PDF, Word, or Excel.
          </p>
        </div>
      </div>

      <UButton
        label="Report Header"
        icon="i-lucide-panel-top"
        color="neutral"
        variant="outline"
        @click="brandingOpen = true"
      />
    </header>

    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-circle-help"
      title="Simple reporting process"
      description="1. Select the date and academic term. 2. Choose one report below. 3. Review, print, or download the result."
    />

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-calendar-range" class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-highlighted">Reporting Period</h2>
            <p class="text-xs text-muted">These filters are applied automatically to the selected report.</p>
          </div>
        </div>
      </template>

      <div class="space-y-5">
        <div>
          <p class="mb-2 text-sm font-medium text-highlighted">Quick date selection</p>
          <div class="flex flex-wrap gap-2">
            <UButton label="Today" size="sm" color="neutral" variant="soft" @click="setPeriod('today')" />
            <UButton label="This Week" size="sm" color="neutral" variant="soft" @click="setPeriod('week')" />
            <UButton label="This Month" size="sm" color="neutral" variant="soft" @click="setPeriod('month')" />
            <UButton label="This Year" size="sm" color="neutral" variant="soft" @click="setPeriod('year')" />
            <UButton label="All Records" size="sm" color="neutral" variant="ghost" @click="setPeriod('all')" />
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UFormField label="Start Date">
            <UInput v-model="filters.from" type="date" class="w-full" />
          </UFormField>
          <UFormField label="End Date">
            <UInput v-model="filters.to" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Academic Year">
            <USelect v-model="filters.academicYear" :items="academicYearItems" class="w-full" />
          </UFormField>
          <UFormField label="Semester">
            <USelect v-model="filters.semester" :items="semesterItems" class="w-full" />
          </UFormField>
        </div>
      </div>
    </UCard>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <main class="space-y-6">
        <section v-for="group in groupedReports" :key="group.key" class="space-y-3">
          <div class="flex items-start gap-3">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-elevated text-muted">
              <UIcon :name="group.icon" class="size-4" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">{{ group.label }}</h2>
              <p class="text-xs text-muted">{{ group.description }}</p>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <UCard
              v-for="report in group.reports"
              :key="report.key"
              class="transition hover:border-primary/40"
              :ui="{ body: 'h-full' }"
            >
              <div class="flex h-full flex-col gap-4">
                <div class="flex items-start gap-3">
                  <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UIcon :name="report.icon" class="size-5" />
                  </div>
                  <div class="min-w-0">
                    <h3 class="font-semibold leading-snug text-highlighted">{{ report.label }}</h3>
                    <p class="mt-1 text-sm leading-5 text-muted">{{ report.description }}</p>
                  </div>
                </div>

                <div class="mt-auto flex items-end justify-between gap-3">
                  <p class="max-w-[70%] text-xs text-muted">{{ report.periodHint }}</p>
                  <UButton
                    label="Generate"
                    icon="i-lucide-file-play"
                    size="sm"
                    :loading="loadingKey === report.key"
                    :disabled="loadingKey !== null && loadingKey !== report.key"
                    @click="generateReport(report.key)"
                  />
                </div>
              </div>
            </UCard>
          </div>
        </section>
      </main>

      <aside class="xl:sticky xl:top-6 xl:self-start">
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
                <UIcon name="i-lucide-layers-3" class="size-5" />
              </div>
              <div>
                <h2 class="font-semibold text-highlighted">Create a Combined Report</h2>
                <p class="text-xs text-muted">Choose the summaries to place in one document.</p>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField label="Report Title">
              <UInput v-model="combinedTitle" class="w-full" />
            </UFormField>

            <UFormField label="Purpose or Description">
              <UTextarea v-model="combinedPurpose" :rows="3" class="w-full" />
            </UFormField>

            <div>
              <p class="mb-2 text-sm font-medium text-highlighted">Information to include</p>
              <div class="space-y-2">
                <button
                  v-for="report in combinedOptions"
                  :key="report.key"
                  type="button"
                  class="flex w-full items-start gap-3 rounded-xl border p-3 text-left transition"
                  :class="
                    combinedSelections.includes(report.key)
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-default hover:bg-elevated/40'
                  "
                  @click="toggleCombined(report.key)"
                >
                  <div
                    class="flex size-7 shrink-0 items-center justify-center rounded-lg"
                    :class="combinedSelections.includes(report.key) ? 'bg-primary text-white' : 'bg-elevated text-muted'"
                  >
                    <UIcon
                      :name="combinedSelections.includes(report.key) ? 'i-lucide-check' : report.icon"
                      class="size-3.5"
                    />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-highlighted">{{ report.label }}</p>
                    <p class="mt-0.5 text-xs leading-4 text-muted">{{ report.description }}</p>
                  </div>
                </button>
              </div>
            </div>

            <UButton
              label="Generate Combined Report"
              icon="i-lucide-file-stack"
              block
              :loading="loadingKey === 'combined'"
              :disabled="loadingKey !== null && loadingKey !== 'combined'"
              @click="generateCombinedReport"
            />
          </div>
        </UCard>
      </aside>
    </div>

    <section id="report-preview" class="scroll-mt-6">
      <UCard v-if="activeReport && customizedReport">
        <template #header>
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <UBadge color="primary" variant="soft" :label="customizedReport.category" />
              <h2 class="mt-2 text-2xl font-bold text-highlighted">{{ customizedReport.title }}</h2>
              <p class="mt-1 max-w-3xl text-sm leading-6 text-muted">{{ customizedReport.description }}</p>
              <p class="mt-2 text-xs text-muted">
                <span class="font-medium text-highlighted">Reporting period:</span>
                {{ customizedReport.periodLabel }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton
                label="Customize Report"
                icon="i-lucide-file-pen-line"
                color="primary"
                variant="soft"
                @click="openReportCustomization"
              />
              <UButton
                label="Print"
                icon="i-lucide-printer"
                color="neutral"
                variant="outline"
                :loading="isPrinting"
                @click="printActive"
              />
              <UButton
                label="PDF"
                icon="i-lucide-file-down"
                color="neutral"
                variant="outline"
                :loading="exportingFormat === 'pdf'"
                @click="exportActive('pdf')"
              />
              <UButton
                label="Word"
                icon="i-lucide-file-text"
                color="neutral"
                variant="outline"
                :loading="exportingFormat === 'docx'"
                @click="exportActive('docx')"
              />
              <UButton
                label="Excel"
                icon="i-lucide-sheet"
                color="primary"
                variant="soft"
                :loading="exportingFormat === 'xlsx'"
                @click="exportActive('xlsx')"
              />
            </div>
          </div>
        </template>

        <div class="space-y-7">
          <div class="flex flex-col gap-3 rounded-2xl border border-default bg-elevated/25 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-semibold text-highlighted">Report ready for review</p>
              <p class="mt-1 text-xs text-muted">
                {{ includedSectionCount }} of {{ reportCustomization.sections.length }} table sections included
                <span v-if="reportCustomization.includeNotes"> · Notes included</span>
                <span v-else> · Notes excluded</span>
              </p>
            </div>
            <UButton
              label="Edit Name and Sections"
              icon="i-lucide-settings-2"
              color="neutral"
              variant="outline"
              @click="openReportCustomization"
            />
          </div>

          <div v-if="customizedReport.metrics.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div
              v-for="(metric, metricIndex) in customizedReport.metrics"
              :key="`${metric.label}-${metricIndex}`"
              class="rounded-2xl border p-4"
              :class="metricTone(metric.tone)"
            >
              <div class="flex items-start justify-between gap-3">
                <p class="text-xs font-medium text-muted">{{ metric.label }}</p>
                <UIcon v-if="metric.icon" :name="metric.icon" class="size-4 text-muted" />
              </div>
              <p class="mt-2 text-2xl font-bold text-highlighted">
                {{ formatCell(metric.value, metric.format) }}
              </p>
              <p v-if="metric.description" class="mt-1 text-xs text-muted">{{ metric.description }}</p>
            </div>
          </div>

          <section v-for="table in customizedReport.tables" :key="table.id" class="space-y-3">
            <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 class="font-semibold text-highlighted">{{ table.title }}</h3>
                <p v-if="table.description" class="text-xs text-muted">{{ table.description }}</p>
              </div>
              <UBadge color="neutral" variant="soft" :label="`${table.rows.length} record${table.rows.length === 1 ? '' : 's'}`" />
            </div>

            <div class="overflow-x-auto rounded-xl border border-default">
              <table class="min-w-full divide-y divide-default text-sm">
                <thead class="bg-elevated/70">
                  <tr>
                    <th
                      v-for="column in table.columns"
                      :key="column.key"
                      class="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                    >
                      {{ column.label }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr v-if="table.rows.length === 0">
                    <td :colspan="table.columns.length" class="px-4 py-10 text-center text-muted">
                      No records were found for the selected period.
                    </td>
                  </tr>
                  <tr v-for="(row, rowIndex) in table.rows" :key="rowIndex" class="hover:bg-elevated/30">
                    <td v-for="column in table.columns" :key="column.key" class="px-3 py-3 align-top text-toned">
                      {{ formatCell(row[column.key], column.format) }}
                    </td>
                  </tr>
                  <tr v-if="table.totalRow" class="bg-elevated font-semibold">
                    <td v-for="column in table.columns" :key="column.key" class="px-3 py-3 text-highlighted">
                      {{ formatCell(table.totalRow[column.key], column.format) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <UAlert
            v-if="customizedReport.notes?.length"
            color="info"
            variant="soft"
            icon="i-lucide-notebook-pen"
            title="Report Notes"
          >
            <template #description>
              <ul class="list-disc space-y-1 pl-5 text-sm">
                <li v-for="note in customizedReport.notes" :key="note">{{ note }}</li>
              </ul>
            </template>
          </UAlert>
        </div>
      </UCard>

      <UCard v-else>
        <div class="py-12 text-center">
          <UIcon name="i-lucide-file-search" class="mx-auto size-10 text-muted" />
          <h2 class="mt-3 font-semibold text-highlighted">No report generated yet</h2>
          <p class="mt-1 text-sm text-muted">Choose one of the reports above.</p>
        </div>
      </UCard>
    </section>

    <UModal
      v-model:open="reportCustomizationOpen"
      :ui="{ content: 'sm:max-w-3xl max-h-[92dvh] overflow-y-auto' }"
    >
      <template #content>
        <div class="p-5 sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold text-highlighted">Customize Report Before Export</h2>
              <p class="mt-1 text-sm text-muted">
                Change the report name, choose which tables to include, and decide whether Report Notes should appear.
              </p>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              square
              aria-label="Close"
              @click="reportCustomizationOpen = false"
            />
          </div>

          <div class="mt-6 space-y-5">
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Report Name" class="sm:col-span-2">
                <UInput v-model="reportCustomization.title" class="w-full" />
              </UFormField>

              <UFormField label="Purpose or Description" class="sm:col-span-2">
                <UTextarea v-model="reportCustomization.description" :rows="3" class="w-full" />
              </UFormField>
            </div>

            <div class="rounded-2xl border border-default p-4">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold text-highlighted">Report Notes</p>
                  <p class="mt-1 text-xs text-muted">Optional. Turn this off when the official report does not need notes.</p>
                </div>
                <USwitch v-model="reportCustomization.includeNotes" />
              </div>

              <UTextarea
                v-if="reportCustomization.includeNotes"
                v-model="reportCustomization.notesText"
                :rows="4"
                class="mt-4 w-full"
                placeholder="Enter one note per line."
              />
            </div>

            <div>
              <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 class="font-semibold text-highlighted">Tables to Include</h3>
                  <p class="mt-1 text-xs text-muted">Rename each table and switch off sections that should not appear in Print, PDF, Word, or Excel.</p>
                </div>
                <div class="flex gap-2">
                  <UButton label="Include All" size="sm" color="neutral" variant="soft" @click="includeAllReportSections(true)" />
                  <UButton label="Exclude All" size="sm" color="neutral" variant="ghost" @click="includeAllReportSections(false)" />
                </div>
              </div>

              <div class="mt-4 space-y-3">
                <div
                  v-for="(section, index) in reportCustomization.sections"
                  :key="section.id"
                  class="rounded-2xl border border-default p-4"
                  :class="section.included ? 'bg-default' : 'bg-elevated/40 opacity-75'"
                >
                  <div class="flex items-start gap-3">
                    <USwitch v-model="section.included" class="mt-1 shrink-0" />
                    <div class="min-w-0 flex-1 space-y-3">
                      <div class="flex items-center justify-between gap-3">
                        <p class="text-xs font-semibold uppercase tracking-wide text-muted">Table {{ index + 1 }}</p>
                        <UBadge
                          :color="section.included ? 'success' : 'neutral'"
                          variant="soft"
                          :label="section.included ? 'Included' : 'Excluded'"
                        />
                      </div>

                      <UFormField label="Table Title">
                        <UInput v-model="section.title" :disabled="!section.included" class="w-full" />
                      </UFormField>

                      <UFormField label="Short Description" hint="Optional">
                        <UTextarea
                          v-model="section.description"
                          :disabled="!section.included"
                          :rows="2"
                          class="w-full"
                        />
                      </UFormField>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <UButton
              label="Restore Defaults"
              icon="i-lucide-rotate-ccw"
              color="neutral"
              variant="ghost"
              @click="restoreReportDefaults"
            />
            <div class="flex justify-end gap-3">
              <UButton label="Cancel" color="neutral" variant="outline" @click="reportCustomizationOpen = false" />
              <UButton
                label="Apply Changes"
                icon="i-lucide-check"
                :disabled="includedSectionCount === 0"
                @click="reportCustomizationOpen = false"
              />
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="brandingOpen" :ui="{ content: 'sm:max-w-2xl max-h-[92dvh] overflow-y-auto' }">
      <template #content>
        <div class="p-5 sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold text-highlighted">Official Report Header</h2>
              <p class="mt-1 text-sm text-muted">
                The logos are positioned close to the institution text based on the Library's sample document.
              </p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" square aria-label="Close" @click="brandingOpen = false" />
          </div>

          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <UFormField label="Institution Name" class="sm:col-span-2">
              <UInput v-model="branding.schoolName" class="w-full" />
            </UFormField>
            <UFormField label="Office or Department" class="sm:col-span-2">
              <UInput v-model="branding.officeName" class="w-full" />
            </UFormField>
            <UFormField label="Address Lines" class="sm:col-span-2" hint="Use a new line for the second address line.">
              <UTextarea v-model="branding.address" :rows="3" class="w-full" />
            </UFormField>
            <UFormField label="Prepared By">
              <UInput v-model="branding.preparedBy" class="w-full" />
            </UFormField>
            <UFormField label="Approved or Certified By">
              <UInput v-model="branding.signatoryName" class="w-full" />
            </UFormField>
            <UFormField label="Position or Designation" class="sm:col-span-2">
              <UInput v-model="branding.signatoryTitle" class="w-full" />
            </UFormField>
          </div>

          <UAlert
            class="mt-5"
            color="info"
            variant="soft"
            icon="i-lucide-images"
            title="Official logos"
            description="The report uses /sncbt-logo.png and /sncbt-library-logo.png from the Nuxt public folder."
          />

          <div class="mt-6 flex justify-end gap-3">
            <UButton label="Cancel" color="neutral" variant="outline" @click="brandingOpen = false" />
            <UButton label="Save Header" icon="i-lucide-save" @click="saveBranding" />
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
