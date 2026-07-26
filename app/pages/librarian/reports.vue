
<script setup lang="ts">
import type {
  LibraryReportArchiveItem,
  LibraryReportBranding,
  LibraryReportCatalogItem,
  LibraryReportDocument,
  LibraryReportFilter,
  LibraryReportKey,
  LibraryReportMetric,
  LibraryReportTable,
} from "~/types/libraryReports";

definePageMeta({
  layout: "librarian",
  title: "Reports",
});

const reportApi =
  useLibraryReports();
const reportExport =
  useLibraryReportExport();
const auth = useAuth();
const toast = useToast();

const catalog =
  ref<LibraryReportCatalogItem[]>(
    [],
  );
const dashboardReport =
  ref<LibraryReportDocument | null>(
    null,
  );
const activeReport =
  ref<LibraryReportDocument | null>(
    null,
  );

const selectedType =
  ref<LibraryReportKey>(
    "membership-statistics",
  );
const selectedTableIndex =
  ref(0);
const previewLimit = ref(25);

const isLoadingDashboard =
  ref(false);
const isGenerating =
  ref(false);
const exportingFormat =
  ref<
    "pdf" | "docx" | "xlsx" | null
  >(null);

const brandingOpen = ref(false);

function dateInput(
  date: Date,
): string {
  return date
    .toISOString()
    .slice(0, 10);
}

function monthStart(): string {
  const date = new Date();
  return dateInput(
    new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
    ),
  );
}

function today(): string {
  return dateInput(
    new Date(),
  );
}

function defaultAcademicYear() {
  const date = new Date();
  const start =
    date.getMonth() >= 5
      ? date.getFullYear()
      : date.getFullYear() - 1;

  return `${start}-${start + 1}`;
}

const filters =
  reactive<LibraryReportFilter>({
    from: monthStart(),
    to: today(),
    academicYear:
      defaultAcademicYear(),
    semester:
      "First Semester",
  });

const branding =
  reactive<LibraryReportBranding>({
    schoolName:
      "ST. NICOLAS COLLEGE OF BUSINESS AND TECHNOLOGY",
    officeName:
      "SNCBT LIBRARY AND LEARNING RESOURCE CENTER",
    address:
      "City of San Fernando, Pampanga",
    institutionLogoUrl:
      "/sncbt-logo.png",
    libraryLogoUrl:
      "/sncbt-library-logo.png",
    preparedBy:
      auth.user.value?.username ??
      "SNCBT Librarian",
    signatoryName: "",
    signatoryTitle:
      "Authorized Librarian",
  });

const recentExports =
  ref<LibraryReportArchiveItem[]>(
    [],
  );

const formatOptions = [
  {
    value: "pdf",
    label: "PDF",
    icon:
      "i-lucide-file-type-2",
    description:
      "Print-ready portable document",
  },
  {
    value: "docx",
    label: "Word",
    icon:
      "i-lucide-file-text",
    description:
      "Editable Microsoft Word document",
  },
  {
    value: "xlsx",
    label: "Excel",
    icon:
      "i-lucide-sheet",
    description:
      "Formatted workbook with separate sheets",
  },
] as const;

const semesterItems = [
  "First Semester",
  "Second Semester",
  "Summer",
];

const academicYearItems =
  computed(() => {
    const current =
      new Date()
        .getFullYear();

    return Array.from(
      {
        length: 7,
      },
      (_, index) => {
        const start =
          current -
          3 +
          index;

        return `${start}-${start + 1}`;
      },
    );
  });

const selectedCatalogItem =
  computed(() =>
    catalog.value.find(
      (item) =>
        item.value ===
        selectedType.value,
    ),
  );

const groupedCatalog =
  computed(() => {
    const groups =
      new Map<
        string,
        LibraryReportCatalogItem[]
      >();

    for (
      const item of
      catalog.value
    ) {
      const group =
        groups.get(
          item.category,
        ) ?? [];

      group.push(item);
      groups.set(
        item.category,
        group,
      );
    }

    return [
      ...groups.entries(),
    ].map(
      ([category, items]) => ({
        category,
        items,
      }),
    );
  });

const previewTable =
  computed<LibraryReportTable | null>(
    () =>
      activeReport.value
        ?.tables[
          selectedTableIndex.value
        ] ?? null,
  );

const previewRows =
  computed(() =>
    previewTable.value
      ?.rows.slice(
        0,
        previewLimit.value,
      ) ?? [],
  );

const remainingRows =
  computed(() =>
    Math.max(
      (
        previewTable.value
          ?.rows.length ??
        0
      ) -
        previewRows.value.length,
      0,
    ),
  );

const chartData =
  computed(() => {
    const table =
      dashboardReport.value
        ?.tables.find(
          (item) =>
            item.rows.length >
              0 &&
            item.columns.some(
              (column) =>
                column.format ===
                  "number" ||
                column.format ===
                  "currency",
            ),
        );

    if (!table) {
      return [];
    }

    const labelColumn =
      table.columns.find(
        (column) =>
          ![
            "number",
            "currency",
            "percent",
          ].includes(
            column.format ??
              "text",
          ),
      ) ??
      table.columns[0];

    const valueColumn =
      table.columns.find(
        (column) =>
          column.format ===
            "number" ||
          column.format ===
            "currency",
      );

    if (!valueColumn) {
      return [];
    }

    return table.rows
      .slice(0, 8)
      .map((row) => ({
        label: String(
          row[
            labelColumn.key
          ] ?? "Unspecified",
        ),
        value:
          Number(
            row[
              valueColumn.key
            ] ?? 0,
          ) || 0,
      }));
  });

const chartMax =
  computed(() =>
    Math.max(
      ...chartData.value.map(
        (item) =>
          item.value,
      ),
      1,
    ),
  );

function toneClass(
  tone:
    LibraryReportMetric["tone"],
): string {
  if (tone === "success") {
    return "bg-success/10 text-success";
  }

  if (tone === "warning") {
    return "bg-warning/10 text-warning";
  }

  if (tone === "error") {
    return "bg-error/10 text-error";
  }

  if (tone === "info") {
    return "bg-info/10 text-info";
  }

  if (tone === "neutral") {
    return "bg-muted text-muted";
  }

  return "bg-primary/10 text-primary";
}

function formatCell(
  value: unknown,
  format?: any,
): string {
  return reportExport
    .formatValue(
      value,
      format,
    );
}

function saveBranding() {
  if (!import.meta.client) {
    return;
  }

  localStorage.setItem(
    "sncbt-report-branding",
    JSON.stringify(branding),
  );
  brandingOpen.value =
    false;

  toast.add({
    title:
      "Report branding saved",
    description:
      "The logos and institution header will be used for PDF, Word, and Excel exports.",
    color: "success",
    icon:
      "i-lucide-badge-check",
  });
}

function loadLocalState() {
  if (!import.meta.client) {
    return;
  }

  try {
    const savedBranding =
      localStorage.getItem(
        "sncbt-report-branding",
      );

    if (savedBranding) {
      Object.assign(
        branding,
        JSON.parse(
          savedBranding,
        ),
      );
    }

    const savedExports =
      localStorage.getItem(
        "sncbt-report-archive",
      );

    if (savedExports) {
      recentExports.value =
        JSON.parse(
          savedExports,
        );
    }
  } catch {
    // Ignore malformed local preferences.
  }
}

function archiveExport(
  format:
    "pdf"
    | "docx"
    | "xlsx",
  report: LibraryReportDocument,
) {
  const item:
    LibraryReportArchiveItem = {
      id:
        `REP-${Date.now()}`,
      title: report.title,
      format,
      generatedAt:
        new Date()
          .toISOString(),
      periodLabel:
        report.periodLabel,
    };

  recentExports.value = [
    item,
    ...recentExports.value,
  ].slice(0, 8);

  if (import.meta.client) {
    localStorage.setItem(
      "sncbt-report-archive",
      JSON.stringify(
        recentExports.value,
      ),
    );
  }
}

function setDatePreset(
  preset:
    | "month"
    | "year"
    | "all",
) {
  const date =
    new Date();

  if (preset === "month") {
    filters.from =
      monthStart();
    filters.to =
      today();
  } else if (
    preset === "year"
  ) {
    filters.from =
      dateInput(
        new Date(
          date.getFullYear(),
          0,
          1,
        ),
      );
    filters.to =
      today();
  } else {
    filters.from =
      undefined;
    filters.to =
      undefined;
  }
}

async function loadCatalog() {
  try {
    catalog.value =
      await reportApi.catalog();
  } catch (error) {
    toast.add({
      title:
        "Report catalog unavailable",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  }
}

async function loadDashboard() {
  isLoadingDashboard.value =
    true;

  try {
    dashboardReport.value =
      await reportApi.dashboard(
        filters,
      );

    if (
      !activeReport.value
    ) {
      activeReport.value =
        dashboardReport.value;
    }
  } catch (error) {
    toast.add({
      title:
        "Analytics could not be loaded",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    isLoadingDashboard.value =
      false;
  }
}

async function generatePreview(
  type = selectedType.value,
) {
  isGenerating.value =
    true;
  selectedType.value = type;

  try {
    activeReport.value =
      await reportApi.generate(
        type,
        filters,
      );
    selectedTableIndex.value =
      0;
    previewLimit.value = 25;

    toast.add({
      title: "Report prepared",
      description:
        `${activeReport.value.title} is ready for review and export.`,
      color: "success",
      icon:
        "i-lucide-file-check-2",
    });
  } catch (error) {
    toast.add({
      title:
        "Report generation failed",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    isGenerating.value =
      false;
  }
}

async function exportActive(
  format:
    | "pdf"
    | "docx"
    | "xlsx",
) {
  if (
    !activeReport.value
  ) {
    await generatePreview();

    if (!activeReport.value) {
      return;
    }
  }

  exportingFormat.value =
    format;

  try {
    await reportExport
      .exportReport(
        format,
        activeReport.value,
        branding,
      );

    archiveExport(
      format,
      activeReport.value,
    );

    toast.add({
      title:
        `${format.toUpperCase()} report generated`,
      description:
        "The formatted report has been downloaded.",
      color: "success",
      icon:
        "i-lucide-download",
    });
  } catch (error) {
    toast.add({
      title:
        "Export failed",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    exportingFormat.value =
      null;
  }
}

function chooseReport(
  item: LibraryReportCatalogItem,
) {
  selectedType.value =
    item.value;
  void generatePreview(
    item.value,
  );
}

watch(
  () => [
    filters.from,
    filters.to,
  ],
  () => {
    // Dashboard refresh is explicit to avoid excessive report queries.
  },
);

onMounted(async () => {
  loadLocalState();

  await Promise.all([
    loadCatalog(),
    loadDashboard(),
  ]);
});
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div
      class="mx-auto max-w-[1500px] space-y-6"
    >
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <div
            class="flex flex-wrap items-center gap-2"
          >
            <h1
              class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
            >
              Analytics & Reports
            </h1>

            <UBadge
              color="primary"
              variant="soft"
            >
              PDF · Word · Excel
            </UBadge>
          </div>

          <p
            class="mt-1 max-w-3xl text-sm leading-relaxed text-muted"
          >
            Review membership, Library Card, collection inventory, circulation, fines, reservations, and transaction analytics, then generate an institution-formatted report.
          </p>
        </div>

        <div
          class="flex flex-wrap gap-2"
        >
          <UButton
            label="Report Branding"
            icon="i-lucide-panels-top-left"
            color="neutral"
            variant="outline"
            @click="() => {
              brandingOpen = true
            }"
          />

          <UButton
            label="Refresh Analytics"
            icon="i-lucide-refresh-cw"
            color="primary"
            variant="soft"
            :loading="
              isLoadingDashboard
            "
            @click="
              loadDashboard
            "
          />
        </div>
      </div>

      <div
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <template
          v-if="isLoadingDashboard"
        >
          <USkeleton
            v-for="item in 10"
            :key="item"
            class="h-32 rounded-2xl"
          />
        </template>

        <UCard
          v-for="
            item in
            dashboardReport?.metrics ??
            []
          "
          v-else
          :key="item.label"
          :ui="{
            body: 'p-4 sm:p-5',
          }"
        >
          <div
            class="flex items-start justify-between gap-3"
          >
            <div class="min-w-0">
              <p
                class="text-sm text-muted"
              >
                {{ item.label }}
              </p>

              <p
                class="mt-2 truncate text-2xl font-bold text-highlighted"
              >
                {{
                  formatCell(
                    item.value,
                    item.format,
                  )
                }}
              </p>

              <p
                v-if="
                  item.description
                "
                class="mt-1 text-xs text-muted"
              >
                {{
                  item.description
                }}
              </p>
            </div>

            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl"
              :class="
                toneClass(
                  item.tone,
                )
              "
            >
              <UIcon
                :name="
                  item.icon ||
                  'i-lucide-chart-no-axes-combined'
                "
                class="size-5"
              />
            </div>
          </div>
        </UCard>
      </div>

      <div
        class="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]"
      >
        <div class="space-y-6">
          <UCard>
            <template #header>
              <div
                class="flex items-center gap-3"
              >
                <div
                  class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <UIcon
                    name="i-lucide-file-chart-column-increasing"
                    class="size-5"
                  />
                </div>

                <div>
                  <h2
                    class="font-semibold text-highlighted"
                  >
                    Generate Report
                  </h2>
                  <p
                    class="text-xs text-muted"
                  >
                    Select scope, preview, and export
                  </p>
                </div>
              </div>
            </template>

            <div class="space-y-4">
              <UFormField
                label="Report Type"
                required
              >
                <USelect
                  v-model="
                    selectedType
                  "
                  :items="catalog"
                  value-key="value"
                  label-key="label"
                  placeholder="Select report"
                  class="w-full"
                />
              </UFormField>

              <div
                class="rounded-xl border border-default bg-elevated/30 p-3"
              >
                <p
                  class="text-sm font-medium text-highlighted"
                >
                  {{
                    selectedCatalogItem?.label
                  }}
                </p>

                <p
                  class="mt-1 text-xs leading-relaxed text-muted"
                >
                  {{
                    selectedCatalogItem?.description
                  }}
                </p>
              </div>

              <div>
                <p
                  class="mb-2 text-sm font-medium text-highlighted"
                >
                  Date Range
                </p>

                <div
                  class="mb-3 flex flex-wrap gap-2"
                >
                  <UButton
                    label="This Month"
                    color="neutral"
                    variant="soft"
                    size="xs"
                    @click="
                      setDatePreset(
                        'month',
                      )
                    "
                  />

                  <UButton
                    label="This Year"
                    color="neutral"
                    variant="soft"
                    size="xs"
                    @click="
                      setDatePreset(
                        'year',
                      )
                    "
                  />

                  <UButton
                    label="All Records"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click="
                      setDatePreset(
                        'all',
                      )
                    "
                  />
                </div>

                <div
                  class="grid grid-cols-2 gap-3"
                >
                  <UFormField label="From">
                    <UInput
                      v-model="
                        filters.from
                      "
                      type="date"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField label="To">
                    <UInput
                      v-model="
                        filters.to
                      "
                      type="date"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </div>

              <div
                class="grid gap-3 sm:grid-cols-2"
              >
                <UFormField
                  label="Academic Year"
                >
                  <USelect
                    v-model="
                      filters.academicYear
                    "
                    :items="
                      academicYearItems
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  label="Semester"
                >
                  <USelect
                    v-model="
                      filters.semester
                    "
                    :items="
                      semesterItems
                    "
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UButton
                label="Generate Preview"
                icon="i-lucide-file-search-2"
                color="primary"
                block
                size="lg"
                :loading="
                  isGenerating
                "
                @click="
                  generatePreview()
                "
              />
            </div>

            <template #footer>
              <div class="space-y-3">
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Export Current Report
                </p>

                <div
                  class="grid grid-cols-3 gap-2"
                >
                  <UButton
                    v-for="
                      option in
                      formatOptions
                    "
                    :key="
                      option.value
                    "
                    :label="
                      option.label
                    "
                    :icon="
                      option.icon
                    "
                    color="neutral"
                    variant="outline"
                    block
                    :loading="
                      exportingFormat ===
                      option.value
                    "
                    @click="
                      exportActive(
                        option.value,
                      )
                    "
                  />
                </div>
              </div>
            </template>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2
                  class="font-semibold text-highlighted"
                >
                  Operational Distribution
                </h2>
                <p
                  class="text-xs text-muted"
                >
                  Quick visual from the current dashboard summary
                </p>
              </div>
            </template>

            <div
              v-if="
                chartData.length > 0
              "
              class="space-y-4"
            >
              <div
                v-for="
                  item in
                  chartData
                "
                :key="item.label"
              >
                <div
                  class="mb-1 flex items-center justify-between gap-3 text-xs"
                >
                  <span
                    class="truncate text-muted"
                  >
                    {{ item.label }}
                  </span>

                  <span
                    class="font-semibold text-highlighted"
                  >
                    {{
                      formatCell(
                        item.value,
                        'number',
                      )
                    }}
                  </span>
                </div>

                <div
                  class="h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    class="h-full rounded-full bg-primary transition-all"
                    :style="{
                      width:
                        `${Math.max(
                          (item.value /
                            chartMax) *
                            100,
                          2,
                        )}%`,
                    }"
                  />
                </div>
              </div>
            </div>

            <UEmpty
              v-else
              icon="i-lucide-chart-bar"
              title="No chart data"
              description="Generate records to populate the operational distribution."
            />
          </UCard>
        </div>

        <div class="space-y-6">
          <UCard>
            <template #header>
              <div
                class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div>
                  <h2
                    class="font-semibold text-highlighted"
                  >
                    Report Library
                  </h2>

                  <p
                    class="mt-1 text-sm text-muted"
                  >
                    Complete report templates for Library membership, inventory, circulation, and transaction monitoring.
                  </p>
                </div>

                <UBadge
                  color="primary"
                  variant="soft"
                  size="lg"
                >
                  {{
                    catalog.length
                  }}
                  report types
                </UBadge>
              </div>
            </template>

            <div
              class="space-y-6"
            >
              <section
                v-for="
                  group in
                  groupedCatalog
                "
                :key="
                  group.category
                "
              >
                <div
                  class="mb-3 flex items-center gap-3"
                >
                  <h3
                    class="font-semibold text-highlighted"
                  >
                    {{
                      group.category
                    }}
                  </h3>

                  <div
                    class="h-px flex-1 bg-default"
                  />
                </div>

                <div
                  class="grid gap-3 md:grid-cols-2"
                >
                  <button
                    v-for="
                      item in
                      group.items
                    "
                    :key="
                      item.value
                    "
                    type="button"
                    class="group rounded-2xl border p-4 text-left transition"
                    :class="
                      selectedType ===
                      item.value
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-default bg-elevated/20 hover:border-primary/30 hover:bg-elevated/60'
                    "
                    @click="
                      chooseReport(
                        item,
                      )
                    "
                  >
                    <div
                      class="flex items-start gap-3"
                    >
                      <div
                        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                      >
                        <UIcon
                          :name="
                            item.icon
                          "
                          class="size-5"
                        />
                      </div>

                      <div
                        class="min-w-0"
                      >
                        <p
                          class="font-semibold text-highlighted"
                        >
                          {{
                            item.label
                          }}
                        </p>

                        <p
                          class="mt-1 line-clamp-2 text-xs leading-relaxed text-muted"
                        >
                          {{
                            item.description
                          }}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </section>
            </div>
          </UCard>
        </div>
      </div>

      <UCard
        v-if="activeReport"
        :ui="{
          body: 'p-0',
        }"
      >
        <template #header>
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
          >
            <div
              class="flex min-w-0 items-start gap-4"
            >
              <div
                class="hidden size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-default bg-white sm:flex"
              >
                <img
                  :src="
                    branding.institutionLogoUrl
                  "
                  alt="SNCBT logo"
                  class="size-12 object-contain"
                />
              </div>

              <div class="min-w-0">
                <p
                  class="text-xs font-bold uppercase tracking-[0.18em] text-primary"
                >
                  {{
                    branding.officeName
                  }}
                </p>

                <h2
                  class="mt-1 text-xl font-bold text-highlighted"
                >
                  {{
                    activeReport.title
                  }}
                </h2>

                <p
                  class="mt-1 max-w-4xl text-sm text-muted"
                >
                  {{
                    activeReport.description
                  }}
                </p>

                <div
                  class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"
                >
                  <span>
                    Period:
                    {{
                      activeReport.periodLabel
                    }}
                  </span>

                  <span>
                    Generated:
                    {{
                      formatCell(
                        activeReport.generatedAt,
                        'datetime',
                      )
                    }}
                  </span>
                </div>
              </div>
            </div>

            <div
              class="flex flex-wrap gap-2"
            >
              <UButton
                v-for="
                  option in
                  formatOptions
                "
                :key="
                  option.value
                "
                :label="
                  option.label
                "
                :icon="
                  option.icon
                "
                color="neutral"
                variant="outline"
                :loading="
                  exportingFormat ===
                  option.value
                "
                @click="
                  exportActive(
                    option.value,
                  )
                "
              />
            </div>
          </div>
        </template>

        <div
          class="border-b border-default p-4 sm:p-6"
        >
          <div
            class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
          >
            <div
              v-for="
                item in
                activeReport.metrics
              "
              :key="
                item.label
              "
              class="rounded-xl border border-default bg-elevated/30 p-3"
            >
              <p
                class="text-xs text-muted"
              >
                {{ item.label }}
              </p>

              <p
                class="mt-1 truncate text-lg font-bold text-highlighted"
              >
                {{
                  formatCell(
                    item.value,
                    item.format,
                  )
                }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="border-b border-default px-4 py-3 sm:px-6"
        >
          <div
            class="flex gap-2 overflow-x-auto pb-1"
          >
            <UButton
              v-for="
                (
                  table,
                  index
                ) in
                activeReport.tables
              "
              :key="
                table.id
              "
              :label="
                table.title
              "
              :color="
                selectedTableIndex ===
                index
                  ? 'primary'
                  : 'neutral'
              "
              :variant="
                selectedTableIndex ===
                index
                  ? 'soft'
                  : 'ghost'
              "
              size="sm"
              class="shrink-0"
              @click="() => {
                selectedTableIndex =
                  index
              }"
            />
          </div>
        </div>

        <div
          v-if="previewTable"
          class="p-4 sm:p-6"
        >
          <div
            class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <h3
                class="font-semibold text-highlighted"
              >
                {{
                  previewTable.title
                }}
              </h3>

              <p
                v-if="
                  previewTable.description
                "
                class="mt-1 text-sm text-muted"
              >
                {{
                  previewTable.description
                }}
              </p>
            </div>

            <UBadge
              color="neutral"
              variant="soft"
            >
              {{
                previewTable.rows.length
              }}
              rows
            </UBadge>
          </div>

          <div
            class="overflow-x-auto rounded-xl border border-default"
          >
            <table
              class="w-full min-w-max text-left text-sm"
            >
              <thead>
                <tr
                  class="bg-elevated"
                >
                  <th
                    v-for="
                      item in
                      previewTable.columns
                    "
                    :key="
                      item.key
                    "
                    class="whitespace-nowrap border-b border-default px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
                    :class="{
                      'text-right':
                        item.align ===
                        'right',
                      'text-center':
                        item.align ===
                        'center',
                    }"
                  >
                    {{
                      item.label
                    }}
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="
                    (
                      row,
                      rowIndex
                    ) in
                    previewRows
                  "
                  :key="
                    rowIndex
                  "
                  class="border-b border-default/70 last:border-0 hover:bg-elevated/40"
                >
                  <td
                    v-for="
                      item in
                      previewTable.columns
                    "
                    :key="
                      item.key
                    "
                    class="max-w-80 px-3 py-3 align-top"
                    :class="{
                      'text-right':
                        item.align ===
                        'right',
                      'text-center':
                        item.align ===
                        'center',
                    }"
                  >
                    <UBadge
                      v-if="
                        item.format ===
                        'status'
                      "
                      color="neutral"
                      variant="soft"
                    >
                      {{
                        formatCell(
                          row[
                            item.key
                          ],
                          item.format,
                        ) ||
                        '—'
                      }}
                    </UBadge>

                    <span
                      v-else
                      class="break-words text-highlighted"
                    >
                      {{
                        formatCell(
                          row[
                            item.key
                          ],
                          item.format,
                        ) ||
                        '—'
                      }}
                    </span>
                  </td>
                </tr>

                <tr
                  v-if="
                    previewTable.totalRow
                  "
                  class="bg-elevated font-semibold"
                >
                  <td
                    v-for="
                      item in
                      previewTable.columns
                    "
                    :key="
                      item.key
                    "
                    class="border-t border-default px-3 py-3"
                    :class="{
                      'text-right':
                        item.align ===
                        'right',
                      'text-center':
                        item.align ===
                        'center',
                    }"
                  >
                    {{
                      formatCell(
                        previewTable
                          .totalRow[
                          item.key
                        ],
                        item.format,
                      )
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-if="
              remainingRows > 0
            "
            class="mt-4 flex justify-center"
          >
            <UButton
              :label="
                `Show ${Math.min(
                  remainingRows,
                  50,
                )} more rows`
              "
              icon="i-lucide-chevrons-down"
              color="neutral"
              variant="soft"
              @click="() => {
                previewLimit +=
                  50
              }"
            />
          </div>

          <div
            v-if="
              activeReport.notes?.length
            "
            class="mt-6"
          >
            <UAlert
              color="info"
              variant="soft"
              icon="i-lucide-info"
              title="Report Notes"
            >
              <template #description>
                <ul
                  class="list-disc space-y-1 pl-5"
                >
                  <li
                    v-for="
                      note in
                      activeReport.notes
                    "
                    :key="note"
                  >
                    {{ note }}
                  </li>
                </ul>
              </template>
            </UAlert>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div
            class="flex items-center justify-between gap-4"
          >
            <div>
              <h2
                class="font-semibold text-highlighted"
              >
                Recent Exports
              </h2>

              <p
                class="text-xs text-muted"
              >
                Local record of files generated from this browser
              </p>
            </div>

            <UBadge
              color="neutral"
              variant="soft"
            >
              {{
                recentExports.length
              }}
            </UBadge>
          </div>
        </template>

        <UEmpty
          v-if="
            recentExports.length ===
            0
          "
          icon="i-lucide-file-clock"
          title="No exported reports yet"
          description="Generated PDF, Word, and Excel files will be listed here."
        />

        <div
          v-else
          class="divide-y divide-default"
        >
          <div
            v-for="
              item in
              recentExports
            "
            :key="
              item.id
            "
            class="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div
              class="flex min-w-0 items-center gap-3"
            >
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              >
                <UIcon
                  :name="
                    item.format ===
                    'xlsx'
                      ? 'i-lucide-sheet'
                      : item.format ===
                          'docx'
                        ? 'i-lucide-file-text'
                        : 'i-lucide-file-type-2'
                  "
                  class="size-5"
                />
              </div>

              <div class="min-w-0">
                <p
                  class="truncate font-medium text-highlighted"
                >
                  {{
                    item.title
                  }}
                </p>

                <p
                  class="mt-1 text-xs text-muted"
                >
                  {{
                    item.periodLabel
                  }}
                  ·
                  {{
                    formatCell(
                      item.generatedAt,
                      'datetime',
                    )
                  }}
                </p>
              </div>
            </div>

            <UBadge
              color="neutral"
              variant="soft"
              class="uppercase"
            >
              {{
                item.format
              }}
            </UBadge>
          </div>
        </div>
      </UCard>
    </div>

    <UModal
      v-model:open="
        brandingOpen
      "
      :ui="{
        content:
          'sm:max-w-2xl max-h-[92dvh] overflow-y-auto',
      }"
    >
      <template #content>
        <div class="p-5 sm:p-6">
          <div
            class="flex items-start justify-between gap-4"
          >
            <div>
              <h2
                class="text-xl font-bold text-highlighted"
              >
                Report Branding
              </h2>

              <p
                class="mt-1 text-sm text-muted"
              >
                Configure the common header used by PDF, Word, and Excel reports.
              </p>
            </div>

            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              square
              aria-label="Close branding settings"
              @click="() => {
                brandingOpen =
                  false
              }"
            />
          </div>

          <div
            class="mt-6 grid gap-4 sm:grid-cols-2"
          >
            <UFormField
              label="School Name"
              class="sm:col-span-2"
            >
              <UInput
                v-model="
                  branding.schoolName
                "
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Office / Library Name"
              class="sm:col-span-2"
            >
              <UInput
                v-model="
                  branding.officeName
                "
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Address"
              class="sm:col-span-2"
            >
              <UInput
                v-model="
                  branding.address
                "
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Institution Logo URL"
              description="Example: /sncbt-logo.png"
            >
              <UInput
                v-model="
                  branding.institutionLogoUrl
                "
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Library Logo URL"
              description="Example: /sncbt-library-logo.png or a Strapi upload URL"
            >
              <UInput
                v-model="
                  branding.libraryLogoUrl
                "
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Prepared By"
            >
              <UInput
                v-model="
                  branding.preparedBy
                "
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Signatory Name"
            >
              <UInput
                v-model="
                  branding.signatoryName
                "
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Signatory Title"
              class="sm:col-span-2"
            >
              <UInput
                v-model="
                  branding.signatoryTitle
                "
                class="w-full"
              />
            </UFormField>
          </div>

          <UAlert
            class="mt-5"
            color="info"
            variant="soft"
            icon="i-lucide-image"
            title="Logo files"
            description="Place the logos in the Nuxt public directory or enter complete Strapi media URLs. Missing logos are omitted without preventing report generation."
          />

          <div
            class="mt-6 flex justify-end gap-3"
          >
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              @click="() => {
                brandingOpen =
                  false
              }"
            />

            <UButton
              label="Save Branding"
              icon="i-lucide-save"
              color="primary"
              @click="
                saveBranding
              "
            />
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
