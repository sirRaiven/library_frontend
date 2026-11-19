<script setup lang="ts">
import AppDataSkeleton from "~/components/shared/AppDataSkeleton.vue";
import type {
  LibraryReportBranding,
  LibraryReportDocument,
  LibraryReportFilter,
  LibraryReportKey,
} from "~/types/libraryReports";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Reports",
});

type StandardLibraryReportKey = Exclude<LibraryReportKey, "custom-summary">;
type ReportSource = "library" | "audit";
type ExportFormat = "pdf" | "docx" | "xlsx";

interface ReportOption {
  value: string;
  label: string;
  source: ReportSource;
  description: string;
  icon: string;
}

const libraryReports = useLibraryReports();
const adminReports = useAdminReports();
const reportExport = useLibraryReportExport();
const libraryOptions = useLibraryOptions();
const academicTerms = libraryOptions.academicTerms;
const toast = useToast();
const auth = useAuth();
const route = useRoute();

const reportView = computed<"library" | "monitoring">(() =>
  route.query.view === "monitoring" ? "monitoring" : "library",
);

const now = new Date();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  .toISOString()
  .slice(0, 10);
const today = now.toISOString().slice(0, 10);

const reportOptions: ReportOption[] = [
  { value: "executive-summary", label: "Executive Library Summary", source: "library", description: "Overall Library activity, membership, collection, circulation, attendance, reservations, and fines.", icon: "i-lucide-layout-dashboard" },
  { value: "membership-statistics", label: "Membership Status", source: "library", description: "Student membership renewal, active, pending, and expired membership statistics.", icon: "i-lucide-id-card" },
  { value: "membership-registry", label: "Student Member Register", source: "library", description: "Detailed Student membership and Library Card register for the selected academic term.", icon: "i-lucide-graduation-cap" },
  { value: "faculty-registry", label: "Faculty Library User Register", source: "library", description: "Registered Faculty users, employee numbers, departments, positions, and current status.", icon: "i-lucide-briefcase-business" },
  { value: "inventory-summary", label: "Collection and Inventory Summary", source: "library", description: "Book titles, physical copies, Shelf Locations, conditions, status, and collection value.", icon: "i-lucide-library-big" },
  { value: "inventory-detail", label: "Complete Book Inventory", source: "library", description: "Detailed physical-copy inventory including accession, barcode, Shelf Location, condition, and price.", icon: "i-lucide-list-tree" },
  { value: "circulation-summary", label: "Circulation Summary", source: "library", description: "Borrowing, returns, outstanding items, overdue activity, reservations, and fines for the selected period.", icon: "i-lucide-arrow-left-right" },
  { value: "borrowing-summary", label: "Borrowing Statistics", source: "library", description: "Borrowing totals and patterns by date, member group, and collection information.", icon: "i-lucide-chart-no-axes-column-increasing" },
  { value: "borrowing-transactions", label: "Borrowing Register", source: "library", description: "Detailed borrowing transactions with borrower, book copy, borrowed date, due date, and status.", icon: "i-lucide-book-up" },
  { value: "return-summary", label: "Return Statistics", source: "library", description: "Returned books by date, returned condition, and assessed fines.", icon: "i-lucide-chart-column-big" },
  { value: "return-transactions", label: "Return Register", source: "library", description: "Detailed completed returns, borrower, book, condition, fine, and processing information.", icon: "i-lucide-book-down" },
  { value: "overdue-outstanding", label: "Outstanding and Overdue Books", source: "library", description: "Books still out or overdue with borrower and follow-up information.", icon: "i-lucide-clock-alert" },
  { value: "fines-penalties", label: "Fines and Payments", source: "library", description: "Assessed fines, payment status, Official Receipt verification, and penalties.", icon: "i-lucide-receipt-text" },
  { value: "reservations", label: "Reservation Status", source: "library", description: "Pending, approved, ready-for-pickup, completed, cancelled, and expired reservations.", icon: "i-lucide-calendar-clock" },
  { value: "popular-books", label: "Most Borrowed Books", source: "library", description: "Book titles and categories borrowed most frequently during the selected period.", icon: "i-lucide-trophy" },
  { value: "member-activity", label: "Student and Faculty Library Use", source: "library", description: "Visits, borrowing, active loans, overdue books, and completed returns by member group.", icon: "i-lucide-users-round" },
  { value: "visitor-summary", label: "Library Attendance", source: "library", description: "Student and Faculty Library attendance statistics for the selected period.", icon: "i-lucide-door-open" },
  { value: "visitor-log", label: "Visitor Log", source: "library", description: "Detailed accepted Student Library Card and Faculty ID time-in records.", icon: "i-lucide-list-checks" },
  { value: "audit-trail", label: "Administrative Audit Report", source: "audit", description: "Formal report of protected administrative, security, configuration, system, privacy, and transaction events.", icon: "i-lucide-scroll-text" },
];

const selectedType = ref(reportOptions[0]!.value);
const filters = reactive<LibraryReportFilter>({
  from: monthStart,
  to: today,
  academicYear: "",
  semester: "",
});
const auditCategory = ref("All");
const auditSeverity = ref("All");
const auditOutcome = ref("All");
const activeReport = ref<LibraryReportDocument | null>(null);
const loading = ref(false);
const exporting = ref<ExportFormat | "print" | null>(null);

const branding = reactive<LibraryReportBranding>({
  schoolName: "St. Nicolas College of Business and Technology",
  officeName: "LIBRARY DEPARTMENT",
  address: "2nd Flr. Mel-Vi Bldg., JASA Road\nCity of San Fernando, Pampanga",
  institutionLogoUrl: "/sncbt-logo.png",
  libraryLogoUrl: "/sncbt-library-logo.png",
  preparedBy: auth.user.value?.username || "SNCBT Administrator",
  signatoryName: "",
  signatoryTitle: "Authorized Administrator",
});

const semesterItems = computed(() =>
  libraryOptions.semesters.value.map(item => item.value),
);
const academicYearItems = computed(() =>
  [...new Set(
    academicTerms.value
      .filter(item => item.active !== false)
      .map(item => item.academicYear),
  )].sort().reverse(),
);

function applyCurrentAcademicTerm() {
  const term = libraryOptions.currentAcademicTerm.value;
  if (!term) return;
  if (!filters.academicYear) filters.academicYear = term.academicYear;
  if (!filters.semester) filters.semester = term.semesterName;
}
const auditCategories = ["All", "Administrative", "Security", "Configuration", "Transaction", "Privacy", "System"];
const auditSeverities = ["All", "Info", "Notice", "Warning", "Critical"];
const auditOutcomes = ["All", "Success", "Failure", "Denied"];

const selectedDefinition = computed(() =>
  reportOptions.find((item) => item.value === selectedType.value) ?? reportOptions[0]!,
);
const isAudit = computed(() => selectedDefinition.value.source === "audit");

const formalReportOptions = computed(() =>
  reportOptions.map((item) => ({ label: item.label, value: item.value })),
);

function validateDates() {
  if (filters.from && filters.to && filters.from > filters.to) {
    toast.add({
      title: "Invalid reporting period",
      description: "The start date must not be after the end date.",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
    return false;
  }
  return true;
}

async function generateReport() {
  if (loading.value || !validateDates()) return;
  loading.value = true;
  try {
    if (isAudit.value) {
      activeReport.value = await adminReports.audit({
        from: filters.from,
        to: filters.to,
        category: auditCategory.value,
        severity: auditSeverity.value,
        outcome: auditOutcome.value,
      });
    } else {
      activeReport.value = await libraryReports.generate(
        selectedType.value as StandardLibraryReportKey,
        filters,
      );
    }
  } catch (error) {
    toast.add({
      title: "Unable to generate report",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

async function exportCurrent(format: ExportFormat) {
  if (!activeReport.value || exporting.value) return;
  exporting.value = format;
  try {
    await reportExport.exportReport(format, activeReport.value, branding);
  } catch (error) {
    toast.add({
      title: "Report export failed",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    exporting.value = null;
  }
}

async function printCurrent() {
  if (!activeReport.value || exporting.value) return;
  exporting.value = "print";
  try {
    await reportExport.previewAndPrint(activeReport.value, branding);
  } catch (error) {
    toast.add({
      title: "Print preview failed",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    exporting.value = null;
  }
}

function formatMetric(value: unknown, format?: string) {
  if (format === "currency") {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
  }
  if (format === "percent") return `${Number(value || 0).toLocaleString("en-US")}%`;
  if (format === "number") return Number(value || 0).toLocaleString("en-US");
  return String(value ?? "—");
}

function previewValue(value: unknown, format?: string) {
  if (value === null || value === undefined || value === "") return "—";
  if (format === "currency") {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
  }
  if (format === "number") return Number(value || 0).toLocaleString("en-US");
  if (format === "datetime") {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime())
      ? String(value)
      : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(date);
  }
  if (format === "date") {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime())
      ? String(value)
      : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(date);
  }
  return String(value);
}

watch(selectedType, () => {
  activeReport.value = null;
});

watch(
  () => auth.user.value?.username,
  (username) => {
    if (username) branding.preparedBy = username;
  },
  { immediate: true },
);

onMounted(async () => {
  try {
    await libraryOptions.loadOperational();
    applyCurrentAcademicTerm();
  } catch {
    // Report generation remains available; the user can retry reference data by reloading the page.
  }
});

</script>

<template>
  <div class="sncbt-page-shell sncbt-staff-page space-y-6">
    <AdminPageHeader
      title="Reports"
      description="Generate Library, audit, and monitoring reports from one place."
      icon="i-lucide-file-chart-column-increasing"
    />

    <nav class="flex flex-wrap gap-1" aria-label="Report categories">
      <UButton
        label="Library Reports"
        icon="i-lucide-library-big"
        :color="reportView === 'library' ? 'primary' : 'neutral'"
        :variant="reportView === 'library' ? 'soft' : 'ghost'"
        :to="{ path: '/admin/reports' }"
        :active="reportView === 'library'"
        :aria-current="reportView === 'library' ? 'page' : undefined"
        replace
      />
      <UButton
        label="Monitoring Reports"
        icon="i-lucide-monitor-dot"
        :color="reportView === 'monitoring' ? 'primary' : 'neutral'"
        :variant="reportView === 'monitoring' ? 'soft' : 'ghost'"
        :to="{ path: '/admin/reports', query: { view: 'monitoring' } }"
        :active="reportView === 'monitoring'"
        :aria-current="reportView === 'monitoring' ? 'page' : undefined"
        replace
      />
    </nav>

    <div v-if="reportView === 'library'" class="space-y-6">
      <UCard>
            <template #header>
              <div>
                <h2 class="font-semibold text-highlighted">Generate Formal Report</h2>
                <p class="mt-1 text-sm text-muted">Select a report and reporting period. Generated reports can be printed or exported without changing Library records.</p>
              </div>
            </template>

            <div class="grid gap-4 lg:grid-cols-4">
              <UFormField label="Report">
                <USelect v-model="selectedType" :items="formalReportOptions" value-key="value" class="w-full" />
              </UFormField>
              <UFormField label="From">
                <UInput v-model="filters.from" type="date" class="w-full" />
              </UFormField>
              <UFormField label="To">
                <UInput v-model="filters.to" type="date" class="w-full" />
              </UFormField>
              <div class="flex items-end">
                <UButton
                  class="w-full justify-center"
                  label="Generate Report"
                  icon="i-lucide-file-chart-column-increasing"
                  :loading="loading"
                  @click="generateReport"
                />
              </div>
            </div>

            <div v-if="!isAudit" class="mt-4 grid gap-4 sm:grid-cols-2">
              <UFormField label="Academic Year">
                <USelect v-model="filters.academicYear" :items="academicYearItems" class="w-full" />
              </UFormField>
              <UFormField label="Semester">
                <USelect v-model="filters.semester" :items="semesterItems" class="w-full" />
              </UFormField>
            </div>

            <div v-else class="mt-4 grid gap-4 sm:grid-cols-3">
              <UFormField label="Classification">
                <USelect v-model="auditCategory" :items="auditCategories" class="w-full" />
              </UFormField>
              <UFormField label="Severity">
                <USelect v-model="auditSeverity" :items="auditSeverities" class="w-full" />
              </UFormField>
              <UFormField label="Result">
                <USelect v-model="auditOutcome" :items="auditOutcomes" class="w-full" />
              </UFormField>
            </div>

            <div class="mt-4 rounded-xl border border-default bg-elevated/30 p-4">
              <div class="flex items-start gap-3">
                <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UIcon :name="selectedDefinition.icon" class="size-4" />
                </div>
                <div>
                  <p class="font-medium text-highlighted">{{ selectedDefinition.label }}</p>
                  <p class="mt-1 text-sm text-muted">{{ selectedDefinition.description }}</p>
                </div>
              </div>
            </div>
          </UCard>

          <AppDataSkeleton v-if="loading && !activeReport" variant="report" :rows="5" label="Generating Library report" />
          <p v-if="loading && activeReport" class="text-xs text-muted" role="status">Updating the report. The previous result remains visible until the new one is ready.</p>
          <UCard v-if="activeReport" :aria-busy="loading">
            <template #header>
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Official Library Report</p>
                  <h2 class="mt-1 text-xl font-semibold text-highlighted">{{ activeReport.title }}</h2>
                  <p class="mt-1 text-sm text-muted">{{ activeReport.periodLabel }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <UButton label="Print" icon="i-lucide-printer" color="neutral" variant="outline" :loading="exporting === 'print'" @click="printCurrent" />
                  <UButton label="PDF" icon="i-lucide-file-text" color="neutral" variant="outline" :loading="exporting === 'pdf'" @click="exportCurrent('pdf')" />
                  <UButton label="DOCX" icon="i-lucide-file-type-2" color="neutral" variant="outline" :loading="exporting === 'docx'" @click="exportCurrent('docx')" />
                  <UButton label="Excel" icon="i-lucide-sheet" color="neutral" variant="outline" :loading="exporting === 'xlsx'" @click="exportCurrent('xlsx')" />
                </div>
              </div>
            </template>

            <div v-if="activeReport.metrics.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div v-for="metric in activeReport.metrics" :key="metric.label" class="rounded-xl border border-default bg-elevated/30 p-4">
                <p class="text-xs text-muted">{{ metric.label }}</p>
                <p class="mt-1 text-xl font-bold text-highlighted">{{ formatMetric(metric.value, metric.format) }}</p>
              </div>
            </div>

            <div class="mt-6 space-y-6">
              <section v-for="table in activeReport.tables" :key="table.id" class="overflow-hidden rounded-xl border border-default">
                <div class="border-b border-default bg-elevated/30 px-4 py-3">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h3 class="font-medium text-highlighted">{{ table.title }}</h3>
                      <p v-if="table.description" class="mt-1 text-xs text-muted">{{ table.description }}</p>
                    </div>
                    <span class="text-xs text-muted">{{ table.rows.length.toLocaleString() }} records</span>
                  </div>
                </div>
                <div class="sncbt-report-table overflow-x-auto" tabindex="0" role="region" :aria-label="table.title">
                  <table class="min-w-full divide-y divide-default text-sm">
                    <thead class="bg-elevated/20">
                      <tr>
                        <th v-for="column in table.columns" :key="column.key" scope="col" class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-muted">
                          {{ column.label }}
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-default">
                      <tr v-for="(row, rowIndex) in table.rows.slice(0, 25)" :key="rowIndex">
                        <td v-for="column in table.columns" :key="column.key" class="max-w-80 px-4 py-3 align-top text-default">
                          {{ previewValue(row[column.key], column.format) }}
                        </td>
                      </tr>
                      <tr v-if="!table.rows.length">
                        <td :colspan="table.columns.length" class="px-4 py-8 text-center text-muted">No records matched the selected reporting period.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="table.rows.length > 25" class="border-t border-default px-4 py-3 text-xs text-muted">
                  Preview shows the first 25 records. Print or export the report to include the complete generated table.
                </div>
              </section>
            </div>

            <UAlert
              v-if="activeReport.notes?.length"
              class="mt-6"
              color="neutral"
              variant="soft"
              icon="i-lucide-info"
              title="Report Notes"
              :description="activeReport.notes.join(' ')"
            />
          </UCard>
    </div>

    <AdminMonitoringReportsPanel v-else />
  </div>
</template>
