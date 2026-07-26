
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

type ReportBuilderMode =
  | "standard"
  | "custom";

type StandardReportKey =
  Exclude<
    LibraryReportKey,
    "custom-summary"
  >;

type CustomSectionKind =
  | "metrics"
  | "table";

interface CustomSummarySection {
  id: string;
  sourceType:
    StandardReportKey;
  sourceLabel: string;
  kind:
    CustomSectionKind;
  title: string;
  description: string;
  rowCount: number;
  selected: boolean;
}

type CustomRowLimit =
  | "10"
  | "25"
  | "50"
  | "all";


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
  ref<StandardReportKey>(
    "membership-statistics",
  );

const reportMode =
  ref<ReportBuilderMode>(
    "standard",
  );

const customSummaryTitle =
  ref(
    "Custom Library Summary Report",
  );

const customSummaryDescription =
  ref(
    "Selected Library management indicators and summary sections for the chosen reporting period.",
  );

const customSourceTypes =
  ref<StandardReportKey[]>([
    "executive-summary",
    "membership-statistics",
    "inventory-summary",
    "circulation-summary",
  ]);

const customReports =
  ref<
    Partial<
      Record<
        StandardReportKey,
        LibraryReportDocument
      >
    >
  >({});

const customSections =
  ref<CustomSummarySection[]>(
    [],
  );

const customSectionLoading =
  ref(false);

const includeCustomNotes =
  ref(true);

const customRowLimit =
  ref<CustomRowLimit>(
    "10",
  );
const isLoadingDashboard =
  ref(false);
const isGenerating =
  ref(false);
const isPrinting = ref(false);
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
      "i-lucide-file-down",
    description:
      "Download a fixed-layout copy",
  },
  {
    value: "docx",
    label: "Word",
    icon:
      "i-lucide-file-text",
    description:
      "Download an editable document",
  },
  {
    value: "xlsx",
    label: "Excel",
    icon:
      "i-lucide-sheet",
    description:
      "Download a workbook for analysis",
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


const customSummarySourceKeys =
  [
    "executive-summary",
    "membership-statistics",
    "inventory-summary",
    "circulation-summary",
    "visitor-summary",
    "popular-books",
    "member-activity",
  ] satisfies
    StandardReportKey[];

const customRowLimitItems = [
  {
    label:
      "Top 10 rows per section",
    value: "10",
  },
  {
    label:
      "Top 25 rows per section",
    value: "25",
  },
  {
    label:
      "Top 50 rows per section",
    value: "50",
  },
  {
    label:
      "Include all rows",
    value: "all",
  },
];

const customSummaryCatalog =
  computed(() =>
    customSummarySourceKeys
      .map((key) =>
        catalog.value.find(
          (item) =>
            item.value === key,
        ),
      )
      .filter(
        (
          item,
        ): item is
          LibraryReportCatalogItem =>
          Boolean(item),
      ),
  );

const selectedCustomSections =
  computed(() =>
    customSections.value.filter(
      (section) =>
        section.selected,
    ),
  );

const selectedCustomSourceCount =
  computed(
    () =>
      customSourceTypes.value
        .length,
  );

const customReportReady =
  computed(
    () =>
      customSections.value
        .length > 0 &&
      selectedCustomSections.value
        .length > 0,
  );

const reportActionDisabled =
  computed(
    () =>
      reportMode.value ===
        "custom" &&
      !customReportReady.value,
  );

const selectedCatalogItem =
  computed(() =>
    catalog.value.find(
      (item) =>
        item.value ===
        selectedType.value,
    ),
  );

const categoryLabels:
  Record<string, string> = {
    Overview:
      "Management Summary",
    Membership:
      "Members and Library Cards",
    Collection:
      "Books and Inventory",
    Circulation:
      "Borrowing and Library Use",
    Transactions:
      "Detailed Transaction Reports",
  };

function categoryLabel(
  value: string,
): string {
  return (
    categoryLabels[value] ??
    value
  );
}

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


function invalidateCustomSections() {
  customReports.value = {};
  customSections.value = [];
}

function toggleCustomSource(
  type: StandardReportKey,
) {
  if (
    customSourceTypes.value
      .includes(type)
  ) {
    customSourceTypes.value =
      customSourceTypes.value
        .filter(
          (item) =>
            item !== type,
        );
  } else {
    customSourceTypes.value = [
      ...customSourceTypes.value,
      type,
    ];
  }

  invalidateCustomSections();
}

function selectAllCustomSources() {
  customSourceTypes.value =
    customSummaryCatalog.value
      .map(
        (item) =>
          item.value as
            StandardReportKey,
      );

  invalidateCustomSections();
}

function clearCustomSources() {
  customSourceTypes.value = [];
  invalidateCustomSections();
}

function toggleCustomSection(
  id: string,
) {
  customSections.value =
    customSections.value.map(
      (section) =>
        section.id === id
          ? {
              ...section,
              selected:
                !section.selected,
            }
          : section,
    );
}

function selectAllCustomSections() {
  customSections.value =
    customSections.value.map(
      (section) => ({
        ...section,
        selected: true,
      }),
    );
}

function clearCustomSections() {
  customSections.value =
    customSections.value.map(
      (section) => ({
        ...section,
        selected: false,
      }),
    );
}

function customSourceSelected(
  type:
    LibraryReportKey,
): boolean {
  return customSourceTypes.value
    .includes(
      type as
        StandardReportKey,
    );
}

async function loadCustomSummarySections(
  showToast = true,
): Promise<boolean> {
  if (
    customSourceTypes.value
      .length === 0
  ) {
    toast.add({
      title:
        "Choose at least one summary area",
      description:
        "Select the Library areas that should provide sections for the custom report.",
      color: "warning",
      icon:
        "i-lucide-list-checks",
    });

    return false;
  }

  customSectionLoading.value =
    true;

  try {
    const reports =
      await Promise.all(
        customSourceTypes.value
          .map(
            async (type) => ({
              type,
              report:
                await reportApi
                  .generate(
                    type,
                    filters,
                  ),
            }),
          ),
      );

    const previous =
      new Map(
        customSections.value.map(
          (section) => [
            section.id,
            section.selected,
          ],
        ),
      );

    const loadedReports:
      Partial<
        Record<
          StandardReportKey,
          LibraryReportDocument
        >
      > = {};

    const sections:
      CustomSummarySection[] =
      [];

    for (
      const item of reports
    ) {
      loadedReports[
        item.type
      ] = item.report;

      if (
        item.report.metrics
          .length > 0
      ) {
        const id =
          `${item.type}:metrics`;

        sections.push({
          id,
          sourceType:
            item.type,
          sourceLabel:
            item.report.title,
          kind: "metrics",
          title:
            "Key Indicators",
          description:
            `${item.report.metrics.length} management indicator${
              item.report.metrics
                .length === 1
                ? ""
                : "s"
            } from ${item.report.title}.`,
          rowCount:
            item.report.metrics
              .length,
          selected:
            previous.get(id) ??
            true,
        });
      }

      for (
        const table of
        item.report.tables
      ) {
        const id =
          `${item.type}:table:${table.id}`;

        sections.push({
          id,
          sourceType:
            item.type,
          sourceLabel:
            item.report.title,
          kind: "table",
          title:
            table.title,
          description:
            table.description ||
            `${table.rows.length} available record${
              table.rows.length ===
                1
                ? ""
                : "s"
            }.`,
          rowCount:
            table.rows.length,
          selected:
            previous.get(id) ??
            true,
        });
      }
    }

    customReports.value =
      loadedReports;
    customSections.value =
      sections;

    if (showToast) {
      toast.add({
        title:
          "Custom summary sections loaded",
        description:
          `${sections.length} available section${
            sections.length === 1
              ? ""
              : "s"
          } can now be included or removed.`,
        color: "success",
        icon:
          "i-lucide-list-checks",
      });
    }

    return true;
  } catch (error) {
    toast.add({
      title:
        "Custom sections could not be loaded",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });

    return false;
  } finally {
    customSectionLoading.value =
      false;
  }
}

function limitedCustomTable(
  table:
    LibraryReportTable,
  sourceTitle: string,
): LibraryReportTable {
  if (
    customRowLimit.value ===
    "all"
  ) {
    return {
      ...table,
      id:
        `${sourceTitle}:${table.id}`,
      title:
        `${sourceTitle} — ${table.title}`,
      columns:
        table.columns.map(
          (column) => ({
            ...column,
          }),
        ),
      rows:
        table.rows.map(
          (row) => ({
            ...row,
          }),
        ),
      totalRow:
        table.totalRow
          ? {
              ...table.totalRow,
            }
          : undefined,
    };
  }

  const limit =
    Number(
      customRowLimit.value,
    );
  const truncated =
    table.rows.length >
    limit;

  return {
    ...table,
    id:
      `${sourceTitle}:${table.id}`,
    title:
      `${sourceTitle} — ${table.title}`,
    description: [
      table.description,
      truncated
        ? `Showing the first ${limit} of ${table.rows.length} available records.`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
    columns:
      table.columns.map(
        (column) => ({
          ...column,
        }),
      ),
    rows:
      table.rows
        .slice(0, limit)
        .map(
          (row) => ({
            ...row,
          }),
        ),
    totalRow:
      table.totalRow
        ? {
            ...table.totalRow,
          }
        : undefined,
  };
}

function buildCustomSummaryReport():
  LibraryReportDocument | null {
  if (
    !customReportReady.value
  ) {
    toast.add({
      title:
        "Select report sections",
      description:
        "Load the summary sections and keep at least one section selected before printing or downloading.",
      color: "warning",
      icon:
        "i-lucide-list-checks",
    });

    return null;
  }

  const selected =
    selectedCustomSections.value;

  const indicatorRows:
    Array<
      Record<
        string,
        string | number
      >
    > = [];

  const tables:
    LibraryReportTable[] = [];

  const sourceReports =
    selected
      .map(
        (section) =>
          customReports.value[
            section.sourceType
          ],
      )
      .filter(
        (
          report,
        ): report is
          LibraryReportDocument =>
          Boolean(report),
      );

  for (
    const section of
    selected
  ) {
    const report =
      customReports.value[
        section.sourceType
      ];

    if (!report) {
      continue;
    }

    if (
      section.kind ===
      "metrics"
    ) {
      for (
        const metric of
        report.metrics
      ) {
        indicatorRows.push({
          reportArea:
            report.title,
          indicator:
            metric.label,
          value:
            formatCell(
              metric.value,
              metric.format,
            ),
          description:
            metric.description ||
            "",
        });
      }

      continue;
    }

    const tableId =
      section.id.split(
        ":table:",
      )[1];

    const table =
      report.tables.find(
        (item) =>
          item.id ===
          tableId,
      );

    if (table) {
      tables.push(
        limitedCustomTable(
          table,
          report.title,
        ),
      );
    }
  }

  if (
    indicatorRows.length > 0
  ) {
    tables.unshift({
      id:
        "custom-key-indicators",
      title:
        "Selected Key Indicators",
      description:
        "Management indicators collected from the selected Library summary areas.",
      columns: [
        {
          key:
            "reportArea",
          label:
            "Report Area",
        },
        {
          key:
            "indicator",
          label:
            "Indicator",
        },
        {
          key: "value",
          label: "Value",
        },
        {
          key:
            "description",
          label:
            "Description",
        },
      ],
      rows:
        indicatorRows,
    });
  }

  const notes =
    includeCustomNotes.value
      ? sourceReports
          .flatMap(
            (report) =>
              (
                report.notes ??
                []
              ).map(
                (note) =>
                  `${report.title}: ${note}`,
              ),
          )
          .filter(
            (
              note,
              index,
              values,
            ) =>
              values.indexOf(
                note,
              ) === index,
          )
      : [];

  const firstReport =
    sourceReports[0];

  return {
    type:
      "custom-summary",
    title:
      customSummaryTitle.value
        .trim() ||
      "Custom Library Summary Report",
    description:
      customSummaryDescription.value
        .trim() ||
      "Selected Library summary sections.",
    category:
      "Overview",
    generatedAt:
      new Date()
        .toISOString(),
    periodLabel:
      firstReport
        ?.periodLabel ||
      [
        filters.from,
        filters.to,
      ]
        .filter(Boolean)
        .join(" to ") ||
      "Complete Records",
    filters: {
      ...filters,
    },
    metrics: [],
    tables,
    notes:
      notes.length > 0
        ? notes
        : undefined,
  };
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

async function prepareReport(
  type = selectedType.value,
): Promise<
  LibraryReportDocument | null
> {
  isGenerating.value = true;

  if (
    reportMode.value ===
    "standard"
  ) {
    selectedType.value =
      type;
  }

  try {
    const report =
      reportMode.value ===
        "custom"
        ? buildCustomSummaryReport()
        : await reportApi.generate(
            type,
            filters,
          );

    if (!report) {
      return null;
    }

    activeReport.value =
      report;

    return report;
  } catch (error) {
    toast.add({
      title:
        "Report could not be prepared",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });

    return null;
  } finally {
    isGenerating.value =
      false;
  }
}

async function previewAndPrintReport() {
  isPrinting.value = true;

  try {
    const report =
      await prepareReport();

    if (!report) {
      return;
    }

    await reportExport
      .previewAndPrint(
        report,
        branding,
      );

    toast.add({
      title:
        "Print preview closed",
      description:
        "The native browser print preview was completed or cancelled.",
      color: "success",
      icon:
        "i-lucide-printer-check",
    });
  } catch (error) {
    toast.add({
      title:
        "Print preview could not be opened",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    isPrinting.value =
      false;
  }
}

async function downloadReport(
  format:
    | "pdf"
    | "docx"
    | "xlsx",
) {
  exportingFormat.value =
    format;

  try {
    const report =
      await prepareReport();

    if (!report) {
      return;
    }

    await reportExport
      .exportReport(
        format,
        report,
        branding,
      );

    archiveExport(
      format,
      report,
    );

    const formatName =
      format === "docx"
        ? "Word"
        : format === "xlsx"
          ? "Excel"
          : "PDF";

    toast.add({
      title:
        `${formatName} report downloaded`,
      description:
        `${report.title} was generated using the selected reporting period.`,
      color: "success",
      icon:
        "i-lucide-download",
    });
  } catch (error) {
    toast.add({
      title:
        "Report download failed",
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
  reportMode.value =
    "standard";
  selectedType.value =
    item.value as
      StandardReportKey;
}

watch(
  () => [
    filters.from,
    filters.to,
    filters.academicYear,
    filters.semester,
  ],
  () => {
    /*
     * Previously loaded custom sections belong to the old filters.
     * Clear them so the user cannot accidentally print stale data.
     */
    invalidateCustomSections();
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
              Library Reports Center
            </h1>

            <UBadge
              color="primary"
              variant="soft"
            >
              Print · PDF · Word · Excel
            </UBadge>
          </div>

          <p
            class="mt-1 max-w-3xl text-sm leading-relaxed text-muted"
          >
            Review key Library analytics, choose the report you need, and open a ready-to-print copy or download it as PDF, Word, or Excel.
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
            @click="
              brandingOpen = true
            "
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
        <div class="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <UCard id="report-builder">
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
                    Create a Library Report
                  </h2>
                  <p
                    class="text-xs text-muted"
                  >
                    Choose a standard report or assemble a custom summary
                  </p>
                </div>
              </div>
            </template>

            <div class="space-y-4">
              <div
                class="grid grid-cols-2 gap-2 rounded-xl bg-elevated p-1"
              >
                <UButton
                  label="Standard Report"
                  icon="i-lucide-file-chart-column"
                  :color="
                    reportMode ===
                    'standard'
                      ? 'primary'
                      : 'neutral'
                  "
                  :variant="
                    reportMode ===
                    'standard'
                      ? 'solid'
                      : 'ghost'
                  "
                  block
                  @click="
                    reportMode =
                      'standard'
                  "
                />

                <UButton
                  label="Custom Summary"
                  icon="i-lucide-list-checks"
                  :color="
                    reportMode ===
                    'custom'
                      ? 'primary'
                      : 'neutral'
                  "
                  :variant="
                    reportMode ===
                    'custom'
                      ? 'solid'
                      : 'ghost'
                  "
                  block
                  @click="
                    reportMode =
                      'custom'
                  "
                />
              </div>

              <template
                v-if="
                  reportMode ===
                  'standard'
                "
              >
                <UFormField
                  label="Report Name"
                  required
                >
                  <USelect
                    v-model="
                      selectedType
                    "
                    :items="catalog"
                    value-key="value"
                    label-key="label"
                    placeholder="Choose a report"
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
              </template>

              <template v-else>
                <UAlert
                  color="info"
                  variant="soft"
                  icon="i-lucide-list-checks"
                  title="Build one report from selected summaries"
                  description="Choose the Library areas first, load their available sections, then keep only the indicators and tables you need."
                />

                <UFormField
                  label="Custom Report Title"
                  required
                >
                  <UInput
                    v-model="
                      customSummaryTitle
                    "
                    icon="i-lucide-heading"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  label="Report Description"
                >
                  <UTextarea
                    v-model="
                      customSummaryDescription
                    "
                    :rows="3"
                    autoresize
                    class="w-full"
                  />
                </UFormField>

                <div>
                  <div
                    class="mb-2 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p
                        class="text-sm font-medium text-highlighted"
                      >
                        Summary Areas
                      </p>

                      <p
                        class="text-xs text-muted"
                      >
                        {{
                          selectedCustomSourceCount
                        }}
                        selected
                      </p>
                    </div>

                    <div
                      class="flex gap-1"
                    >
                      <UButton
                        label="All"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        @click="
                          selectAllCustomSources
                        "
                      />

                      <UButton
                        label="Clear"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        @click="
                          clearCustomSources
                        "
                      />
                    </div>
                  </div>

                  <div
                    class="space-y-2"
                  >
                    <button
                      v-for="
                        item in
                        customSummaryCatalog
                      "
                      :key="
                        item.value
                      "
                      type="button"
                      class="flex w-full items-start gap-3 rounded-xl border p-3 text-left transition"
                      :class="
                        customSourceSelected(
                          item.value,
                        )
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-default bg-elevated/20 hover:border-primary/30'
                      "
                      @click="
                        toggleCustomSource(
                          item.value as StandardReportKey,
                        )
                      "
                    >
                      <div
                        class="flex size-9 shrink-0 items-center justify-center rounded-lg"
                        :class="
                          customSourceSelected(
                            item.value,
                          )
                            ? 'bg-primary text-white'
                            : 'bg-elevated text-muted'
                        "
                      >
                        <UIcon
                          :name="
                            customSourceSelected(
                              item.value,
                            )
                              ? 'i-lucide-check'
                              : item.icon
                          "
                          class="size-4"
                        />
                      </div>

                      <div
                        class="min-w-0"
                      >
                        <p
                          class="text-sm font-semibold text-highlighted"
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
                    </button>
                  </div>
                </div>

                <UButton
                  label="Load Summary Sections"
                  icon="i-lucide-list-tree"
                  color="primary"
                  variant="soft"
                  block
                  :loading="
                    customSectionLoading
                  "
                  :disabled="
                    customSourceTypes.length ===
                    0
                  "
                  @click="
                    loadCustomSummarySections
                  "
                />

                <div
                  v-if="
                    customSections.length >
                    0
                  "
                  class="space-y-3 rounded-xl border border-default p-3"
                >
                  <div
                    class="flex items-center justify-between gap-3"
                  >
                    <div>
                      <p
                        class="text-sm font-medium text-highlighted"
                      >
                        Exact Sections
                      </p>

                      <p
                        class="text-xs text-muted"
                      >
                        {{
                          selectedCustomSections.length
                        }}
                        of
                        {{
                          customSections.length
                        }}
                        included
                      </p>
                    </div>

                    <div
                      class="flex gap-1"
                    >
                      <UButton
                        label="All"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        @click="
                          selectAllCustomSections
                        "
                      />

                      <UButton
                        label="Clear"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        @click="
                          clearCustomSections
                        "
                      />
                    </div>
                  </div>

                  <div
                    class="max-h-72 space-y-2 overflow-y-auto pr-1"
                  >
                    <button
                      v-for="
                        section in
                        customSections
                      "
                      :key="
                        section.id
                      "
                      type="button"
                      class="flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition"
                      :class="
                        section.selected
                          ? 'border-success/40 bg-success/5'
                          : 'border-default bg-elevated/20 opacity-70'
                      "
                      @click="
                        toggleCustomSection(
                          section.id,
                        )
                      "
                    >
                      <div
                        class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md"
                        :class="
                          section.selected
                            ? 'bg-success text-white'
                            : 'bg-elevated text-muted'
                        "
                      >
                        <UIcon
                          :name="
                            section.selected
                              ? 'i-lucide-check'
                              : section.kind ===
                                  'metrics'
                                ? 'i-lucide-gauge'
                                : 'i-lucide-table-2'
                          "
                          class="size-3.5"
                        />
                      </div>

                      <div
                        class="min-w-0 flex-1"
                      >
                        <p
                          class="text-xs font-semibold text-highlighted"
                        >
                          {{
                            section.sourceLabel
                          }}
                        </p>

                        <p
                          class="mt-0.5 text-xs text-muted"
                        >
                          {{
                            section.title
                          }}
                          ·
                          {{
                            section.rowCount
                          }}
                          item{{
                            section.rowCount ===
                            1
                              ? ""
                              : "s"
                          }}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div
                  class="grid gap-3 sm:grid-cols-2"
                >
                  <UFormField
                    label="Rows per Table"
                  >
                    <USelect
                      v-model="
                        customRowLimit
                      "
                      :items="
                        customRowLimitItems
                      "
                      value-key="value"
                      label-key="label"
                      class="w-full"
                    />
                  </UFormField>

                  <div
                    class="flex items-end"
                  >
                    <label
                      class="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg border border-default px-3 py-2 text-sm text-highlighted"
                    >
                      <input
                        v-model="
                          includeCustomNotes
                        "
                        type="checkbox"
                        class="size-4"
                      />

                      Include report notes
                    </label>
                  </div>
                </div>

                <UAlert
                  v-if="
                    customSections.length ===
                    0
                  "
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-mouse-pointer-click"
                  title="Load sections before printing"
                  description="After the sections load, you can remove any indicator or table that should not appear in the final custom summary."
                />
              </template>

              <div>
                <p
                  class="mb-2 text-sm font-medium text-highlighted"
                >
                  Reporting Period
                </p>

                <div
                  class="mb-3 flex flex-wrap gap-2"
                >
                  <UButton
                    label="Current Month"
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
                    label="Current Year"
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
                    label="Complete Records"
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
                :label="
                  reportMode ===
                  'custom'
                    ? 'Preview Custom Summary'
                    : 'Preview & Print'
                "
                icon="i-lucide-printer"
                color="primary"
                block
                size="lg"
                :loading="
                  isPrinting ||
                  isGenerating
                "
                :disabled="
                  reportActionDisabled
                "
                @click="
                  previewAndPrintReport
                "
              />

              <p
                class="text-center text-xs leading-relaxed text-muted"
              >
                {{
                  reportMode ===
                  'custom'
                    ? 'Only the selected custom sections will be included in the native print preview and downloaded files.'
                    : "Opens Chrome's native print preview over this page using a temporary Blob document. No separate report page is opened."
                }}
              </p>
            </div>

            <template #footer>
              <div class="space-y-3">
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Download a Report File
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
                    :disabled="
                      reportActionDisabled
                    "
                    @click="
                      downloadReport(
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
                    Available Library Reports
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
                      categoryLabel(
                        group.category,
                      )
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
                    class="group rounded-xl border p-3 text-left transition"
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

      <UCard>
        <template #header>
          <div
            class="flex items-center justify-between gap-4"
          >
            <div>
              <h2
                class="font-semibold text-highlighted"
              >
                Recent Downloads
              </h2>

              <p
                class="text-xs text-muted"
              >
                Files downloaded from this browser during recent report sessions
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
          title="No downloaded reports yet"
          description="Downloaded PDF, Word, and Excel reports will appear here."
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
              @click="
                brandingOpen =
                  false
              "
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
              @click="
                brandingOpen =
                  false
              "
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
