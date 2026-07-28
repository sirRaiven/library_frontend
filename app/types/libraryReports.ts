export type LibraryReportKey =
  | "custom-summary"
  | "executive-summary"
  | "membership-statistics"
  | "membership-registry"
  | "faculty-registry"
  | "inventory-summary"
  | "inventory-detail"
  | "circulation-summary"
  | "borrowing-transactions"
  | "return-transactions"
  | "overdue-outstanding"
  | "fines-penalties"
  | "reservations"
  | "popular-books"
  | "member-activity"
  | "visitor-summary"
  | "visitor-log";

export type LibraryReportCategory =
  | "Overview"
  | "Membership"
  | "Collection"
  | "Circulation"
  | "Transactions"
  | "Administration"
  | "Members"
  | "Library Visits";

export type ReportCellFormat =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "percent"
  | "status";

export interface LibraryReportCatalogItem {
  value: LibraryReportKey;
  label: string;
  category: LibraryReportCategory;
  description: string;
  icon: string;
  recommendedOrientation?: "portrait" | "landscape";

  /**
   * Optional presentation metadata used by the formal report catalog.
   * Existing API responses remain compatible when these fields are absent.
   */
  purpose?: string;
  contents?: string[];
  official?: boolean;
}

export interface LibraryReportFilter {
  from?: string;
  to?: string;
  academicYear?: string;
  semester?: string;
}

export interface LibraryReportMetric {
  label: string;
  value: string | number;
  format?: ReportCellFormat;
  description?: string;
  icon?: string;
  tone?:
    | "primary"
    | "success"
    | "warning"
    | "error"
    | "info"
    | "neutral";
}

export interface LibraryReportColumn {
  key: string;
  label: string;
  format?: ReportCellFormat;
  align?: "left" | "center" | "right";
  width?: number;
}

export type LibraryReportRow = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface LibraryReportTable {
  id: string;
  title: string;
  description?: string;
  columns: LibraryReportColumn[];
  rows: LibraryReportRow[];
  totalRow?: LibraryReportRow;
}

export interface LibraryReportDocument {
  type: LibraryReportKey;
  title: string;
  description: string;
  category: LibraryReportCategory;
  generatedAt: string;
  periodLabel: string;
  filters: LibraryReportFilter;
  metrics: LibraryReportMetric[];
  tables: LibraryReportTable[];
  notes?: string[];
}

export interface LibraryReportBranding {
  schoolName: string;
  officeName: string;
  address: string;
  institutionLogoUrl: string;
  libraryLogoUrl: string;
  preparedBy: string;
  signatoryName: string;
  signatoryTitle: string;
}

export interface LibraryReportArchiveItem {
  id: string;
  title: string;
  format: "pdf" | "docx" | "xlsx";
  generatedAt: string;
  periodLabel: string;
}
