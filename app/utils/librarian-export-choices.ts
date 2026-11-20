import type { LibraryReportDocument, LibraryReportFilter, LibraryReportKey, ReportCellFormat } from "~/types/libraryReports";

export interface SimpleReportColumn {
  label: string;
  format?: ReportCellFormat;
}

export type SimpleReportValue = string | number | boolean | null | undefined;

export interface SimpleReportTable {
  title?: string;
  columns: SimpleReportColumn[];
  rows: SimpleReportValue[][];
  total?: SimpleReportValue[];
}

export interface SimpleLibraryReport {
  title: string;
  date: string;
  period?: string;
  context?: string;
  tables: SimpleReportTable[];
}

export interface ReportPeriod {
  from: string;
  to: string;
}

export interface LibrarianExportChoice {
  label: string;
  dated?: boolean;
  term?: boolean;
  scope?: string;
  load: (period: ReportPeriod, term?: LibraryReportFilter) => Promise<SimpleLibraryReport> | SimpleLibraryReport;
}

export function libraryReportDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function localLibraryReport(
  title: string,
  columns: Array<string | SimpleReportColumn>,
  rows: SimpleReportValue[][],
  context?: string,
): SimpleLibraryReport {
  return {
    title,
    date: libraryReportDate(),
    context,
    tables: [{
      columns: columns.map(column => typeof column === "string" ? { label: column } : column),
      rows,
    }],
  };
}

type ReportKey = Exclude<LibraryReportKey, "custom-summary">;
type TableSelection = Record<string, string[]>;

const reports: Record<ReportKey, { label: string; dated?: boolean; term?: boolean; tables?: TableSelection }> = {
  "executive-summary": { label: "Library Overview", dated: true },
  "circulation-summary": { label: "Circulation Summary", dated: true, tables: { "daily-circulation": ["date", "borrows", "returns"] } },
  "membership-statistics": { label: "Membership Status Summary", term: true, tables: { "membership-renewal-by-program": ["program", "registered", "active", "notRenewed", "expired", "pending"] } },
  "membership-registry": { label: "Student and Library Card Register", term: true, tables: { "student-membership-registry": ["studentNo", "name", "program", "libraryCardNo", "cardStatus", "membershipStatus", "expiryDate"] } },
  "faculty-registry": { label: "Faculty Register", tables: { "faculty-registry": ["employeeNo", "name", "department", "designation", "status"] } },
  "inventory-summary": { label: "Collection Summary", tables: { "inventory-by-shelf-location": ["shelfLocation", "titles", "copies", "available", "borrowed", "reserved", "damaged", "lost"] } },
  "inventory-detail": { label: "Physical Copy Inventory", tables: { "detailed-inventory": ["accessionNumber", "title", "author", "callNumber", "shelfLocation", "copyStatus", "condition"] } },
  "borrowing-summary": { label: "Daily Borrowing Summary", dated: true, tables: { "daily-borrowing-summary": ["period", "total", "students", "faculty"] } },
  "borrowing-transactions": { label: "Borrowing Register", dated: true, tables: { "borrowing-ledger": ["borrowNo", "memberName", "title", "accessionNumber", "borrowDate", "dueDate", "status"] } },
  "return-summary": { label: "Daily Return Summary", dated: true, tables: { "daily-return-summary": ["period", "total", "students", "faculty"] } },
  "return-transactions": { label: "Return Register", dated: true, tables: { "return-ledger": ["returnNo", "memberName", "title", "accessionNumber", "returnDate", "condition", "fineAmount"] } },
  "overdue-outstanding": { label: "Outstanding Loans", tables: { "overdue-outstanding": ["memberName", "title", "dueDate", "overdueDays", "computedStatus"] } },
  "fines-penalties": { label: "Fines and Payments Register", dated: true, tables: { "fines-ledger": ["fineNo", "memberName", "fineType", "bookTitle", "assessedAt", "amount", "status", "orNumber", "paymentDate"] } },
  reservations: { label: "Reservation Register", dated: true, tables: { "reservation-ledger": ["reservationNo", "memberName", "title", "reservationDate", "expirationDate", "status"] } },
  "popular-books": { label: "Most Borrowed Books", dated: true, tables: { "popular-books": ["rank", "title", "author", "shelfLocation", "borrowCount"] } },
  "member-activity": { label: "Library Use by Member", dated: true, tables: { "member-activity": ["memberType", "memberName", "libraryVisits", "totalBorrows", "returned", "active", "overdue"] } },
  "visitor-summary": { label: "Daily Visitor Summary", dated: true, tables: { "daily-library-visits": ["period", "total", "students", "faculty"] } },
  "visitor-log": { label: "Visitor Log", dated: true, tables: { "library-entry-ledger": ["timeIn", "memberType", "memberName", "programDepartment"] } },
};

export const librarianPageReportKeys: Readonly<Record<string, ReportKey[]>> = {
  dashboard: ["executive-summary", "circulation-summary"],
  "books": ["inventory-summary", "inventory-detail", "popular-books"],
  "books/copies": ["inventory-detail", "inventory-summary"],
  "books/register": ["inventory-summary"],
  "books/import": ["inventory-detail"],
  borrow: ["borrowing-transactions", "borrowing-summary", "overdue-outstanding"],
  return: ["return-transactions", "return-summary"],
  reservations: ["reservations"],
  visits: ["visitor-log", "visitor-summary"],
  fines: ["fines-penalties"],
  history: ["borrowing-transactions", "return-transactions", "member-activity"],
  students: ["membership-registry", "member-activity"],
  faculty: ["faculty-registry", "member-activity"],
  memberships: ["membership-registry", "membership-statistics"],
  "membership-term": ["membership-statistics", "membership-registry"],
  "library-card-designer": ["membership-registry"],
};

const overviewLabels = new Set([
  "Total Registered Students", "Active Memberships", "Total Registered Faculty", "Book Titles",
  "Total Book Copies", "Available Copies", "Time-Ins in Selected Period",
  "Returns in Period", "Books Still Out", "Overdue Books",
]);

function projectReport(
  document: LibraryReportDocument,
  label: string,
  selection?: TableSelection,
): SimpleLibraryReport {
  const tables: SimpleReportTable[] = [];
  if (selection) {
    for (const table of document.tables) {
      const selected = selection[table.id];
      if (!selected) continue;
      const columns = selected.flatMap(key => table.columns.filter(column => column.key === key));
      if (!columns.length) continue;
      const values = (row: typeof table.rows[number]) => columns.map(column => row[column.key]);
      tables.push({
        columns: columns.map(({ label, format }) => ({ label, format })),
        rows: table.rows.map(values),
        total: table.totalRow ? values(table.totalRow) : undefined,
      });
    }
  } else {
    const metrics = document.metrics.filter(metric => overviewLabels.has(metric.label));
    tables.push({
      columns: [{ label: "Measure" }, { label: "Total" }],
      rows: metrics.map(metric => [metric.label, metric.value]),
    });
  }
  if (!tables.length) throw new Error("This report did not return any supported records.");
  return { title: label, date: libraryReportDate(), period: document.periodLabel, tables };
}

export function standardLibrarianChoices(
  page: string,
  generate: (key: ReportKey, filter: LibraryReportFilter) => Promise<LibraryReportDocument>,
  getTerm: () => Promise<LibraryReportFilter>,
): LibrarianExportChoice[] {
  return (librarianPageReportKeys[page] ?? []).map((key) => {
    const report = reports[key];
    return {
      label: report.label,
      dated: report.dated,
      term: report.term,
      scope: report.dated
        ? "Includes all records in the chosen date range."
        : report.term ? "Includes records for the selected academic term." : "Includes the current library records for this report.",
      async load(period, term) {
        const filters = report.dated ? period : report.term ? term ?? await getTerm() : {};
        return projectReport(await generate(key, filters), report.label, report.tables);
      },
    };
  });
}
