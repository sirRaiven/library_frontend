<script setup lang="ts">
import type {
  LibraryReportBranding,
  LibraryReportCategory,
  LibraryReportDocument,
  LibraryReportFilter,
  LibraryReportKey,
  LibraryReportTable,
  ReportCellFormat,
} from "~/types/libraryReports";

definePageMeta({
  layout: "librarian",
  title: "Library Reports",
});

type StandardReportKey = Exclude<
  LibraryReportKey,
  "custom-summary"
>;

type ReportBuilderMode =
  | "standard"
  | "custom";

type CustomSectionKind =
  | "metrics"
  | "table";

type CustomRowLimit =
  | "25"
  | "50"
  | "100"
  | "all";

interface FormalReportDefinition {
  key: StandardReportKey;
  label: string;
  category:
    | "Administration"
    | "Members"
    | "Collection"
    | "Circulation"
    | "Library Visits";
  purpose: string;
  contents: string[];
  icon: string;
  recommendedOrientation:
    | "portrait"
    | "landscape";
}

interface ReportCategoryDefinition {
  key: FormalReportDefinition["category"];
  label: string;
  description: string;
  icon: string;
}

interface CustomSourceDefinition {
  key: StandardReportKey;
  label: string;
  description: string;
  icon: string;
}

interface CustomReportSection {
  id: string;
  sourceType: StandardReportKey;
  sourceLabel: string;
  kind: CustomSectionKind;
  title: string;
  description: string;
  rowCount: number;
  selected: boolean;
}

const reportApi = useLibraryReports();
const reportExport =
  useLibraryReportExport();
const auth = useAuth();
const toast = useToast();

const FORMAL_REPORTS:
  FormalReportDefinition[] = [
  {
    key: "executive-summary",
    label:
      "Library Operations Summary",
    category:
      "Administration",
    purpose:
      "Presents the official overall status of the Library for administrative review.",
    contents: [
      "Key collection and service totals",
      "Current borrowing and overdue status",
      "Membership and attendance indicators",
    ],
    icon:
      "i-lucide-clipboard-check",
    recommendedOrientation:
      "portrait",
  },
  {
    key: "membership-registry",
    label:
      "Student Membership and Library Card Register",
    category: "Members",
    purpose:
      "Lists registered students and the status of their Library membership and Library Card.",
    contents: [
      "Student identification details",
      "Membership validity",
      "Library Card status",
    ],
    icon:
      "i-lucide-id-card",
    recommendedOrientation:
      "landscape",
  },
  {
    key: "faculty-registry",
    label:
      "Faculty Library User Register",
    category: "Members",
    purpose:
      "Provides the official list and account status of faculty members registered in the Library.",
    contents: [
      "Employee and department details",
      "Library account status",
      "Contact information when available",
    ],
    icon:
      "i-lucide-contact-round",
    recommendedOrientation:
      "landscape",
  },
  {
    key: "inventory-summary",
    label:
      "Book Collection Summary",
    category:
      "Collection",
    purpose:
      "Summarizes Library holdings by title, copy status, category, and availability.",
    contents: [
      "Total titles and physical copies",
      "Available, borrowed, lost, or damaged copies",
      "Collection distribution",
    ],
    icon:
      "i-lucide-library-big",
    recommendedOrientation:
      "portrait",
  },
  {
    key: "inventory-detail",
    label:
      "Book Inventory and Copy Register",
    category:
      "Collection",
    purpose:
      "Provides the detailed official inventory of books and every registered physical copy.",
    contents: [
      "Title, author, ISBN, and category",
      "Accession number and barcode",
      "Shelf location, condition, and copy status",
    ],
    icon:
      "i-lucide-notebook-tabs",
    recommendedOrientation:
      "landscape",
  },
  {
    key:
      "borrowing-transactions",
    label:
      "Book Borrowing Register",
    category:
      "Circulation",
    purpose:
      "Lists books released to students and faculty during the selected reporting period.",
    contents: [
      "Borrower and book-copy details",
      "Borrowed date and due date",
      "Current borrowing status",
    ],
    icon:
      "i-lucide-book-up-2",
    recommendedOrientation:
      "landscape",
  },
  {
    key:
      "return-transactions",
    label:
      "Book Return Register",
    category:
      "Circulation",
    purpose:
      "Lists completed book returns and their recorded condition during the selected period.",
    contents: [
      "Borrower and returned book",
      "Return date and condition",
      "Fine or penalty when applicable",
    ],
    icon:
      "i-lucide-book-down",
    recommendedOrientation:
      "landscape",
  },
  {
    key:
      "overdue-outstanding",
    label:
      "Outstanding and Overdue Books Report",
    category:
      "Circulation",
    purpose:
      "Identifies books that remain borrowed and transactions that have passed their due date.",
    contents: [
      "Borrower and book details",
      "Due date and overdue duration",
      "Outstanding account status",
    ],
    icon:
      "i-lucide-triangle-alert",
    recommendedOrientation:
      "landscape",
  },
  {
    key: "fines-penalties",
    label:
      "Fines and Penalties Report",
    category:
      "Circulation",
    purpose:
      "Records assessed fines and penalties and their payment status.",
    contents: [
      "Member and related transaction",
      "Reason and assessed amount",
      "Payment or settlement status",
    ],
    icon:
      "i-lucide-receipt-text",
    recommendedOrientation:
      "landscape",
  },
  {
    key: "reservations",
    label:
      "Book Reservation Register",
    category:
      "Circulation",
    purpose:
      "Lists book reservations and their current processing status.",
    contents: [
      "Member and reserved title",
      "Reservation and expiration dates",
      "Queue and reservation status",
    ],
    icon:
      "i-lucide-calendar-clock",
    recommendedOrientation:
      "landscape",
  },
  {
    key: "visitor-summary",
    label:
      "Library Attendance Summary",
    category:
      "Library Visits",
    purpose:
      "Summarizes student and faculty Library attendance for the selected reporting period.",
    contents: [
      "Total Library visits",
      "Student and faculty attendance",
      "Attendance distribution by date or group",
    ],
    icon:
      "i-lucide-users-round",
    recommendedOrientation:
      "portrait",
  },
  {
    key: "visitor-log",
    label:
      "Library Entry Log",
    category:
      "Library Visits",
    purpose:
      "Provides the detailed official time-in record of Library visitors.",
    contents: [
      "Member identification",
      "Visit date and time-in",
      "Program, department, year, or section",
    ],
    icon:
      "i-lucide-logs",
    recommendedOrientation:
      "landscape",
  },
];

const REPORT_CATEGORIES:
  ReportCategoryDefinition[] = [
  {
    key:
      "Administration",
    label:
      "Administrative Report",
    description:
      "Overall Library status for management review and institutional documentation.",
    icon:
      "i-lucide-building-2",
  },
  {
    key: "Members",
    label:
      "Members and Memberships",
    description:
      "Official records of students, faculty, memberships, and Library Cards.",
    icon:
      "i-lucide-users",
  },
  {
    key: "Collection",
    label:
      "Book Collection and Inventory",
    description:
      "Summary and detailed records of titles and physical book copies.",
    icon:
      "i-lucide-books",
  },
  {
    key:
      "Circulation",
    label:
      "Borrowing, Returns, and Reservations",
    description:
      "Transaction reports covering borrowed books, returns, overdues, fines, and reservations.",
    icon:
      "i-lucide-repeat-2",
  },
  {
    key:
      "Library Visits",
    label:
      "Library Attendance",
    description:
      "Summary and detailed time-in records for students and faculty.",
    icon:
      "i-lucide-door-open",
  },
];

const CUSTOM_SOURCES:
  CustomSourceDefinition[] = [
  {
    key: "executive-summary",
    label:
      "Administrative Summary",
    description:
      "Overall Library totals and operational status.",
    icon:
      "i-lucide-clipboard-check",
  },
  {
    key:
      "membership-statistics",
    label:
      "Members and Memberships",
    description:
      "Student, faculty, membership, and Library Card totals.",
    icon:
      "i-lucide-users",
  },
  {
    key:
      "inventory-summary",
    label:
      "Book Collection",
    description:
      "Collection totals, physical-copy status, and availability.",
    icon:
      "i-lucide-library-big",
  },
  {
    key:
      "circulation-summary",
    label:
      "Circulation Services",
    description:
      "Borrowing, returns, overdues, fines, and reservation totals.",
    icon:
      "i-lucide-repeat-2",
  },
  {
    key: "visitor-summary",
    label:
      "Library Attendance",
    description:
      "Student and faculty Library visit information.",
    icon:
      "i-lucide-door-open",
  },
];

const reportMode =
  ref<ReportBuilderMode>(
    "standard",
  );

const selectedType =
  ref<StandardReportKey>(
    "executive-summary",
  );

const isGenerating =
  ref(false);
const isPrinting =
  ref(false);
const exportingFormat =
  ref<
    "pdf" | "docx" | "xlsx" | null
  >(null);
const brandingOpen =
  ref(false);

const customTitle =
  ref(
    "Consolidated Library Report",
  );
const customPurpose =
  ref(
    "Prepared for official Library monitoring and institutional records.",
  );
const customSourceTypes =
  ref<StandardReportKey[]>([
    "executive-summary",
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
  ref<CustomReportSection[]>(
    [],
  );
const customSectionLoading =
  ref(false);
const customRowLimit =
  ref<CustomRowLimit>(
    "all",
  );
const includeReportNotes =
  ref(false);

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

function defaultAcademicYear():
  string {
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
      "SNCBT Librarian",
    signatoryName: "",
    signatoryTitle:
      "Authorized Librarian",
  });

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

const customRowLimitItems = [
  {
    label:
      "Complete records",
    value: "all",
  },
  {
    label:
      "First 25 records per table",
    value: "25",
  },
  {
    label:
      "First 50 records per table",
    value: "50",
  },
  {
    label:
      "First 100 records per table",
    value: "100",
  },
];

const groupedReports =
  computed(() =>
    REPORT_CATEGORIES.map(
      (category) => ({
        ...category,
        reports:
          FORMAL_REPORTS.filter(
            (report) =>
              report.category ===
              category.key,
          ),
      }),
    ),
  );

const selectedDefinition =
  computed(() =>
    FORMAL_REPORTS.find(
      (report) =>
        report.key ===
        selectedType.value,
    ) ??
    FORMAL_REPORTS[0]!,
  );

const selectedCustomSections =
  computed(() =>
    customSections.value.filter(
      (section) =>
        section.selected,
    ),
  );

const customReportReady =
  computed(
    () =>
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

const selectedPeriodLabel =
  computed(() => {
    if (
      !filters.from &&
      !filters.to
    ) {
      return "Complete records";
    }

    if (
      filters.from &&
      filters.to
    ) {
      return `${filters.from} to ${filters.to}`;
    }

    return (
      filters.from ??
      filters.to ??
      "Selected period"
    );
  });

const selectedCustomSourceCount =
  computed(
    () =>
      customSourceTypes.value
        .length,
  );

function formatCell(
  value: unknown,
  format?:
    ReportCellFormat,
): string {
  return reportExport
    .formatValue(
      value,
      format,
    );
}

function setDatePreset(
  preset:
    | "month"
    | "year"
    | "all",
) {
  const date = new Date();

  if (preset === "month") {
    filters.from =
      monthStart();
    filters.to =
      today();
    return;
  }

  if (preset === "year") {
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
    return;
  }

  filters.from =
    undefined;
  filters.to =
    undefined;
}

function validatePeriod():
  boolean {
  if (
    filters.from &&
    filters.to &&
    filters.from >
      filters.to
  ) {
    toast.add({
      title:
        "Check the reporting period",
      description:
        "The start date must be earlier than or equal to the end date.",
      color: "warning",
      icon:
        "i-lucide-calendar-alert",
    });

    return false;
  }

  return true;
}

function chooseReport(
  report:
    FormalReportDefinition,
) {
  reportMode.value =
    "standard";
  selectedType.value =
    report.key;

  nextTick(() => {
    document
      .getElementById(
        "report-settings",
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  });
}

function invalidateCustomSections() {
  customReports.value = {};
  customSections.value = [];
}

function sourceSelected(
  key: StandardReportKey,
): boolean {
  return customSourceTypes.value
    .includes(key);
}

function toggleCustomSource(
  key: StandardReportKey,
) {
  if (
    sourceSelected(key)
  ) {
    customSourceTypes.value =
      customSourceTypes.value
        .filter(
          (item) =>
            item !== key,
        );
  } else {
    customSourceTypes.value = [
      ...customSourceTypes.value,
      key,
    ];
  }

  invalidateCustomSections();
}

function selectAllCustomSources() {
  customSourceTypes.value =
    CUSTOM_SOURCES.map(
      (source) =>
        source.key,
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

function selectSummarySectionsOnly() {
  customSections.value =
    customSections.value.map(
      (section) => ({
        ...section,
        selected:
          section.kind ===
          "metrics",
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

async function loadCustomSections():
  Promise<boolean> {
  if (
    customSourceTypes.value
      .length === 0
  ) {
    toast.add({
      title:
        "Select at least one Library area",
      description:
        "Choose the Library areas that should appear in the consolidated report.",
      color: "warning",
      icon:
        "i-lucide-list-checks",
    });

    return false;
  }

  if (!validatePeriod()) {
    return false;
  }

  customSectionLoading.value =
    true;

  try {
    const responses =
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
        customSections.value
          .map(
            (section) => [
              section.id,
              section.selected,
            ],
          ),
      );

    const loaded:
      Partial<
        Record<
          StandardReportKey,
          LibraryReportDocument
        >
      > = {};
    const sections:
      CustomReportSection[] =
      [];

    for (
      const response of
      responses
    ) {
      loaded[
        response.type
      ] = response.report;

      const source =
        CUSTOM_SOURCES.find(
          (item) =>
            item.key ===
            response.type,
        );
      const sourceLabel =
        source?.label ??
        response.report.title;

      if (
        response.report.metrics
          .length > 0
      ) {
        const id =
          `${response.type}:metrics`;

        sections.push({
          id,
          sourceType:
            response.type,
          sourceLabel,
          kind: "metrics",
          title:
            "Summary figures",
          description:
            "Official totals and status figures for this Library area.",
          rowCount:
            response.report.metrics
              .length,
          selected:
            previous.get(id) ??
            true,
        });
      }

      for (
        const table of
        response.report.tables
      ) {
        const id =
          `${response.type}:table:${table.id}`;

        sections.push({
          id,
          sourceType:
            response.type,
          sourceLabel,
          kind: "table",
          title:
            table.title,
          description:
            table.description ||
            "Detailed records for this Library area.",
          rowCount:
            table.rows.length,
          selected:
            previous.get(id) ??
            false,
        });
      }
    }

    customReports.value =
      loaded;
    customSections.value =
      sections;

    toast.add({
      title:
        "Report sections loaded",
      description:
        "Summary figures are selected by default. Select only the detailed tables required for the final report.",
      color: "success",
      icon:
        "i-lucide-list-checks",
    });

    return true;
  } catch (error) {
    toast.add({
      title:
        "Report sections could not be loaded",
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

const TECHNICAL_COLUMN_KEYS =
  new Set([
    "documentid",
    "createdat",
    "updatedat",
    "publishedat",
    "metadata",
    "internalid",
    "internalreference",
  ]);

function normalizeKey(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

function isFormalColumn(
  key: string,
  label: string,
): boolean {
  const normalizedKey =
    normalizeKey(key);
  const normalizedLabel =
    normalizeKey(label);

  if (
    TECHNICAL_COLUMN_KEYS.has(
      normalizedKey,
    )
  ) {
    return false;
  }

  return ![
    "documentid",
    "databaseid",
    "internalid",
    "createdat",
    "updatedat",
    "publishedat",
    "metadata",
  ].some(
    (technicalLabel) =>
      normalizedLabel ===
      technicalLabel,
  );
}

function sanitizeTable(
  table:
    LibraryReportTable,
): LibraryReportTable {
  const filteredColumns =
    table.columns.filter(
      (column) =>
        isFormalColumn(
          column.key,
          column.label,
        ),
    );

  const columns =
    filteredColumns.length > 0
      ? filteredColumns
      : table.columns;

  const projectRow = (
    row:
      LibraryReportTable["rows"][number],
  ) =>
    Object.fromEntries(
      columns.map(
        (column) => [
          column.key,
          row[column.key],
        ],
      ),
    );

  return {
    ...table,
    description:
      undefined,
    columns:
      columns.map(
        (column) => ({
          ...column,
        }),
      ),
    rows:
      table.rows.map(
        projectRow,
      ),
    totalRow:
      table.totalRow
        ? projectRow(
            table.totalRow,
          )
        : undefined,
  };
}

function formalizeReport(
  report:
    LibraryReportDocument,
): LibraryReportDocument {
  const definition =
    FORMAL_REPORTS.find(
      (item) =>
        item.key ===
        report.type,
    );

  return {
    ...report,
    title:
      definition?.label ??
      report.title,
    description:
      definition?.purpose ??
      report.description,
    category:
      (definition?.category ??
        report.category) as
        LibraryReportCategory,
    metrics:
      report.metrics.map(
        (metric) => ({
          ...metric,
          description:
            undefined,
        }),
      ),
    tables:
      report.tables.map(
        sanitizeTable,
      ),
    notes:
      includeReportNotes.value
        ? report.notes
        : undefined,
  };
}

function applyRowLimit(
  table:
    LibraryReportTable,
  sourceLabel: string,
): LibraryReportTable {
  const clean =
    sanitizeTable(table);

  if (
    customRowLimit.value ===
    "all"
  ) {
    return {
      ...clean,
      id:
        `${sourceLabel}:${clean.id}`,
      title:
        `${sourceLabel} — ${clean.title}`,
    };
  }

  const limit =
    Number(
      customRowLimit.value,
    );

  return {
    ...clean,
    id:
      `${sourceLabel}:${clean.id}`,
    title:
      `${sourceLabel} — ${clean.title}`,
    rows:
      clean.rows.slice(
        0,
        limit,
      ),
  };
}

function buildCustomReport():
  LibraryReportDocument | null {
  if (
    !customReportReady.value
  ) {
    toast.add({
      title:
        "Select report sections",
      description:
        "Load the available sections and select at least one section for the consolidated report.",
      color: "warning",
      icon:
        "i-lucide-list-checks",
    });

    return null;
  }

  const tables:
    LibraryReportTable[] = [];
  const summaryRows:
    Array<
      Record<
        string,
        string | number
      >
    > = [];

  const usedReports =
    new Map<
      StandardReportKey,
      LibraryReportDocument
    >();

  for (
    const section of
    selectedCustomSections.value
  ) {
    const report =
      customReports.value[
        section.sourceType
      ];

    if (!report) {
      continue;
    }

    usedReports.set(
      section.sourceType,
      report,
    );

    if (
      section.kind ===
      "metrics"
    ) {
      for (
        const metric of
        report.metrics
      ) {
        summaryRows.push({
          area:
            section.sourceLabel,
          indicator:
            metric.label,
          result:
            formatCell(
              metric.value,
              metric.format,
            ),
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
        applyRowLimit(
          table,
          section.sourceLabel,
        ),
      );
    }
  }

  if (
    summaryRows.length > 0
  ) {
    tables.unshift({
      id:
        "consolidated-summary",
      title:
        "Summary of Selected Library Areas",
      columns: [
        {
          key: "area",
          label:
            "Library Area",
        },
        {
          key:
            "indicator",
          label:
            "Indicator",
        },
        {
          key: "result",
          label: "Result",
        },
      ],
      rows:
        summaryRows,
    });
  }

  const firstReport =
    [...usedReports.values()][0];

  const notes =
    includeReportNotes.value
      ? [...usedReports.values()]
          .flatMap(
            (report) =>
              report.notes ?? [],
          )
          .filter(
            (
              note,
              index,
              all,
            ) =>
              all.indexOf(
                note,
              ) === index,
          )
      : undefined;

  return {
    type:
      "custom-summary",
    title:
      customTitle.value
        .trim() ||
      "Consolidated Library Report",
    description:
      customPurpose.value
        .trim() ||
      "Prepared for official Library monitoring and institutional records.",
    category:
      "Administration",
    generatedAt:
      new Date()
        .toISOString(),
    periodLabel:
      firstReport
        ?.periodLabel ??
      selectedPeriodLabel.value,
    filters: {
      ...filters,
    },
    metrics: [],
    tables,
    notes:
      notes &&
      notes.length > 0
        ? notes
        : undefined,
  };
}

async function prepareReport():
  Promise<
    LibraryReportDocument | null
  > {
  if (!validatePeriod()) {
    return null;
  }

  isGenerating.value =
    true;

  try {
    const report =
      reportMode.value ===
        "custom"
        ? buildCustomReport()
        : await reportApi
            .generate(
              selectedType.value,
              filters,
            );

    if (!report) {
      return null;
    }

    return reportMode.value ===
      "custom"
      ? report
      : formalizeReport(
          report,
        );
  } catch (error) {
    toast.add({
      title:
        "The report could not be prepared",
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

async function previewAndPrint() {
  isPrinting.value =
    true;

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

    toast.add({
      title:
        "Report saved",
      description:
        `${report.title} was saved successfully.`,
      color: "success",
      icon:
        "i-lucide-download",
    });
  } catch (error) {
    toast.add({
      title:
        "The report could not be saved",
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

function saveBranding() {
  if (!import.meta.client) {
    return;
  }

  localStorage.setItem(
    "sncbt-report-branding",
    JSON.stringify(
      branding,
    ),
  );
  brandingOpen.value =
    false;

  toast.add({
    title:
      "Report header saved",
    description:
      "The official header and approval details will be used in generated reports.",
    color: "success",
    icon:
      "i-lucide-badge-check",
  });
}

function loadBranding() {
  if (!import.meta.client) {
    return;
  }

  try {
    const saved =
      localStorage.getItem(
        "sncbt-report-branding",
      );

    if (saved) {
      Object.assign(
        branding,
        JSON.parse(saved),
      );
    } else if (
      auth.user.value
        ?.username
    ) {
      branding.preparedBy =
        auth.user.value
          .username;
    }
  } catch {
    // Ignore malformed local preferences.
  }
}

watch(
  () => [
    filters.from,
    filters.to,
    filters.academicYear,
    filters.semester,
  ],
  invalidateCustomSections,
);

onMounted(
  loadBranding,
);
</script>

<template>
  <UContainer
    class="py-6 sm:py-8"
  >
    <div
      class="mx-auto max-w-[1480px] space-y-6"
    >
      <header
        class="flex flex-col gap-4 border-b border-default pb-5 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <div
            class="flex flex-wrap items-center gap-2"
          >
            <h1
              class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
            >
              Library Reports
            </h1>

            <UBadge
              color="primary"
              variant="soft"
            >
              Official Records
            </UBadge>
          </div>

          <p
            class="mt-2 max-w-3xl text-sm leading-relaxed text-muted"
          >
            Select an official report by Library area, set the reporting period, and review it before printing or saving.
          </p>
        </div>

        <UButton
          label="Report Header and Approval"
          icon="i-lucide-stamp"
          color="neutral"
          variant="outline"
          @click="
            brandingOpen = true
          "
        />
      </header>

      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-info"
        title="Reports are organized by their official purpose"
        description="Use a ready-made report for a complete official record. Use the consolidated report only when information from several Library areas must be combined."
      />

      <div
        class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]"
      >
        <main
          class="space-y-6"
        >
          <UCard>
            <template #header>
              <div>
                <h2
                  class="text-lg font-semibold text-highlighted"
                >
                  Official Report Directory
                </h2>

                <p
                  class="mt-1 text-sm text-muted"
                >
                  Choose the Library area first, then select the report that matches the record you need.
                </p>
              </div>
            </template>

            <div
              class="space-y-8"
            >
              <section
                v-for="
                  group in
                  groupedReports
                "
                :key="
                  group.key
                "
              >
                <div
                  class="mb-3 flex items-start gap-3"
                >
                  <div
                    class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                  >
                    <UIcon
                      :name="
                        group.icon
                      "
                      class="size-5"
                    />
                  </div>

                  <div>
                    <h3
                      class="font-semibold text-highlighted"
                    >
                      {{
                        group.label
                      }}
                    </h3>

                    <p
                      class="mt-0.5 text-xs leading-relaxed text-muted"
                    >
                      {{
                        group.description
                      }}
                    </p>
                  </div>
                </div>

                <div
                  class="grid gap-3 md:grid-cols-2"
                >
                  <button
                    v-for="
                      report in
                      group.reports
                    "
                    :key="
                      report.key
                    "
                    type="button"
                    class="rounded-xl border p-4 text-left transition"
                    :class="
                      selectedType ===
                        report.key &&
                      reportMode ===
                        'standard'
                        ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/10'
                        : 'border-default bg-elevated/20 hover:border-primary/40 hover:bg-elevated/50'
                    "
                    @click="
                      chooseReport(
                        report,
                      )
                    "
                  >
                    <div
                      class="flex items-start gap-3"
                    >
                      <div
                        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-elevated text-primary"
                      >
                        <UIcon
                          :name="
                            report.icon
                          "
                          class="size-5"
                        />
                      </div>

                      <div
                        class="min-w-0 flex-1"
                      >
                        <div
                          class="flex flex-wrap items-start justify-between gap-2"
                        >
                          <p
                            class="font-semibold leading-snug text-highlighted"
                          >
                            {{
                              report.label
                            }}
                          </p>

                          <UBadge
                            color="neutral"
                            variant="soft"
                            size="xs"
                            class="capitalize"
                          >
                            {{
                              report.recommendedOrientation
                            }}
                          </UBadge>
                        </div>

                        <p
                          class="mt-2 text-xs leading-relaxed text-muted"
                        >
                          {{
                            report.purpose
                          }}
                        </p>

                        <ul
                          class="mt-3 space-y-1.5"
                        >
                          <li
                            v-for="
                              item in
                              report.contents
                            "
                            :key="item"
                            class="flex items-start gap-2 text-xs text-muted"
                          >
                            <UIcon
                              name="i-lucide-check"
                              class="mt-0.5 size-3.5 shrink-0 text-success"
                            />

                            <span>
                              {{ item }}
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </button>
                </div>
              </section>
            </div>
          </UCard>
        </main>

        <aside
          id="report-settings"
          class="space-y-4 xl:sticky xl:top-6 xl:self-start"
        >
          <UCard>
            <template #header>
              <div
                class="flex items-center gap-3"
              >
                <div
                  class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <UIcon
                    name="i-lucide-file-cog"
                    class="size-5"
                  />
                </div>

                <div>
                  <h2
                    class="font-semibold text-highlighted"
                  >
                    Report Settings
                  </h2>

                  <p
                    class="text-xs text-muted"
                  >
                    Select content, period, and output
                  </p>
                </div>
              </div>
            </template>

            <div
              class="space-y-5"
            >
              <div
                class="grid grid-cols-2 gap-2 rounded-xl bg-elevated p-1"
              >
                <UButton
                  label="Official Report"
                  icon="i-lucide-file-check-2"
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
                  label="Consolidated"
                  icon="i-lucide-layers-3"
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
                <div
                  class="rounded-xl border border-primary/30 bg-primary/5 p-4"
                >
                  <p
                    class="text-xs font-semibold uppercase tracking-wide text-primary"
                  >
                    Selected official report
                  </p>

                  <p
                    class="mt-2 font-semibold leading-snug text-highlighted"
                  >
                    {{
                      selectedDefinition.label
                    }}
                  </p>

                  <p
                    class="mt-2 text-xs leading-relaxed text-muted"
                  >
                    {{
                      selectedDefinition.purpose
                    }}
                  </p>
                </div>
              </template>

              <template v-else>
                <div
                  class="space-y-4"
                >
                  <div>
                    <div
                      class="mb-2 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p
                          class="text-sm font-semibold text-highlighted"
                        >
                          1. Select Library areas
                        </p>

                        <p
                          class="text-xs text-muted"
                        >
                          {{
                            selectedCustomSourceCount
                          }}
                          of
                          {{
                            CUSTOM_SOURCES.length
                          }}
                          selected
                        </p>
                      </div>

                      <div
                        class="flex gap-1"
                      >
                        <UButton
                          label="All"
                          size="xs"
                          color="neutral"
                          variant="ghost"
                          @click="
                            selectAllCustomSources
                          "
                        />

                        <UButton
                          label="Clear"
                          size="xs"
                          color="neutral"
                          variant="ghost"
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
                          source in
                          CUSTOM_SOURCES
                        "
                        :key="
                          source.key
                        "
                        type="button"
                        class="flex w-full items-start gap-3 rounded-xl border p-3 text-left transition"
                        :class="
                          sourceSelected(
                            source.key,
                          )
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-default bg-elevated/20'
                        "
                        @click="
                          toggleCustomSource(
                            source.key,
                          )
                        "
                      >
                        <div
                          class="flex size-8 shrink-0 items-center justify-center rounded-lg"
                          :class="
                            sourceSelected(
                              source.key,
                            )
                              ? 'bg-primary text-white'
                              : 'bg-elevated text-muted'
                          "
                        >
                          <UIcon
                            :name="
                              sourceSelected(
                                source.key,
                              )
                                ? 'i-lucide-check'
                                : source.icon
                            "
                            class="size-4"
                          />
                        </div>

                        <div>
                          <p
                            class="text-sm font-medium text-highlighted"
                          >
                            {{
                              source.label
                            }}
                          </p>

                          <p
                            class="mt-0.5 text-xs leading-relaxed text-muted"
                          >
                            {{
                              source.description
                            }}
                          </p>
                        </div>
                      </button>
                    </div>

                    <UButton
                      label="Load Available Sections"
                      icon="i-lucide-list-tree"
                      color="primary"
                      variant="soft"
                      block
                      class="mt-3"
                      :loading="
                        customSectionLoading
                      "
                      :disabled="
                        customSourceTypes.length ===
                        0
                      "
                      @click="
                        loadCustomSections
                      "
                    />
                  </div>

                  <div
                    v-if="
                      customSections.length >
                      0
                    "
                    class="space-y-3 border-t border-default pt-4"
                  >
                    <div
                      class="flex items-start justify-between gap-3"
                    >
                      <div>
                        <p
                          class="text-sm font-semibold text-highlighted"
                        >
                          2. Select report sections
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
                        class="flex flex-wrap justify-end gap-1"
                      >
                        <UButton
                          label="Summary Only"
                          size="xs"
                          color="neutral"
                          variant="ghost"
                          @click="
                            selectSummarySectionsOnly
                          "
                        />

                        <UButton
                          label="All"
                          size="xs"
                          color="neutral"
                          variant="ghost"
                          @click="
                            selectAllCustomSections
                          "
                        />

                        <UButton
                          label="Clear"
                          size="xs"
                          color="neutral"
                          variant="ghost"
                          @click="
                            clearCustomSections
                          "
                        />
                      </div>
                    </div>

                    <div
                      class="max-h-80 space-y-2 overflow-y-auto pr-1"
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
                        class="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition"
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
                          <div
                            class="flex items-start justify-between gap-2"
                          >
                            <p
                              class="text-xs font-semibold text-highlighted"
                            >
                              {{
                                section.sourceLabel
                              }}
                            </p>

                            <UBadge
                              color="neutral"
                              variant="soft"
                              size="xs"
                            >
                              {{
                                section.kind ===
                                  "metrics"
                                  ? "Summary"
                                  : `${section.rowCount} records`
                              }}
                            </UBadge>
                          </div>

                          <p
                            class="mt-1 text-xs text-muted"
                          >
                            {{
                              section.title
                            }}
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div
                    class="space-y-3 border-t border-default pt-4"
                  >
                    <p
                      class="text-sm font-semibold text-highlighted"
                    >
                      3. Report details
                    </p>

                    <UFormField
                      label="Official Report Title"
                    >
                      <UInput
                        v-model="
                          customTitle
                        "
                        icon="i-lucide-heading"
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      label="Purpose or Reference"
                      description="Optional short statement printed below the title."
                    >
                      <UTextarea
                        v-model="
                          customPurpose
                        "
                        :rows="2"
                        autoresize
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      label="Detailed records"
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
                  </div>
                </div>
              </template>

              <div
                class="space-y-3 border-t border-default pt-4"
              >
                <div>
                  <p
                    class="text-sm font-semibold text-highlighted"
                  >
                    Reporting period
                  </p>

                  <p
                    class="text-xs text-muted"
                  >
                    {{
                      selectedPeriodLabel
                    }}
                  </p>
                </div>

                <div
                  class="flex flex-wrap gap-2"
                >
                  <UButton
                    label="This Month"
                    size="xs"
                    color="neutral"
                    variant="soft"
                    @click="
                      setDatePreset(
                        'month',
                      )
                    "
                  />

                  <UButton
                    label="This Year"
                    size="xs"
                    color="neutral"
                    variant="soft"
                    @click="
                      setDatePreset(
                        'year',
                      )
                    "
                  />

                  <UButton
                    label="All Records"
                    size="xs"
                    color="neutral"
                    variant="ghost"
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
                  <UFormField
                    label="From"
                  >
                    <UInput
                      v-model="
                        filters.from
                      "
                      type="date"
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField
                    label="To"
                  >
                    <UInput
                      v-model="
                        filters.to
                      "
                      type="date"
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <div
                  class="grid grid-cols-2 gap-3"
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
              </div>

              <details
                class="rounded-xl border border-default bg-elevated/20 p-3"
              >
                <summary
                  class="cursor-pointer text-sm font-medium text-highlighted"
                >
                  Additional report option
                </summary>

                <label
                  class="mt-3 flex cursor-pointer items-start gap-3 text-sm text-muted"
                >
                  <input
                    v-model="
                      includeReportNotes
                    "
                    type="checkbox"
                    class="mt-0.5 size-4"
                  />

                  <span>
                    Include system-generated notes. Leave this off for a concise formal report.
                  </span>
                </label>
              </details>

              <div
                class="space-y-2"
              >
                <UButton
                  label="Preview and Print"
                  icon="i-lucide-printer"
                  color="primary"
                  size="lg"
                  block
                  :loading="
                    isPrinting ||
                    isGenerating
                  "
                  :disabled="
                    reportActionDisabled
                  "
                  @click="
                    previewAndPrint
                  "
                />

                <div
                  class="grid grid-cols-3 gap-2"
                >
                  <UButton
                    label="PDF"
                    icon="i-lucide-file-down"
                    color="neutral"
                    variant="outline"
                    block
                    :loading="
                      exportingFormat ===
                      'pdf'
                    "
                    :disabled="
                      reportActionDisabled
                    "
                    @click="
                      downloadReport(
                        'pdf',
                      )
                    "
                  />

                  <UButton
                    label="Word"
                    icon="i-lucide-file-text"
                    color="neutral"
                    variant="outline"
                    block
                    :loading="
                      exportingFormat ===
                      'docx'
                    "
                    :disabled="
                      reportActionDisabled
                    "
                    @click="
                      downloadReport(
                        'docx',
                      )
                    "
                  />

                  <UButton
                    label="Excel"
                    icon="i-lucide-sheet"
                    color="neutral"
                    variant="outline"
                    block
                    :loading="
                      exportingFormat ===
                      'xlsx'
                    "
                    :disabled="
                      reportActionDisabled
                    "
                    @click="
                      downloadReport(
                        'xlsx',
                      )
                    "
                  />
                </div>
              </div>
            </div>
          </UCard>

          <UAlert
            v-if="
              reportMode ===
                'custom' &&
              customSections.length ===
                0
            "
            color="neutral"
            variant="soft"
            icon="i-lucide-list-tree"
            title="Custom sections are not loaded"
            description="Select Library areas and click Load Available Sections before generating the consolidated report."
          />
        </aside>
      </div>
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
        <div
          class="p-5 sm:p-6"
        >
          <div
            class="flex items-start justify-between gap-4"
          >
            <div>
              <h2
                class="text-xl font-bold text-highlighted"
              >
                Report Header and Approval
              </h2>

              <p
                class="mt-1 text-sm text-muted"
              >
                These details appear in the official report header and signature section.
              </p>
            </div>

            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              square
              aria-label="Close report settings"
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
              label="Institution Name"
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
              label="Office or Library Name"
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
              label="Institution Address"
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
              label="Approved or Certified By"
            >
              <UInput
                v-model="
                  branding.signatoryName
                "
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Position or Designation"
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
            icon="i-lucide-images"
            title="Official logos"
            description="The report uses /sncbt-logo.png and /sncbt-library-logo.png from the Nuxt public folder."
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
              label="Save Report Header"
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
