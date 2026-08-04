import type { Cell, Row } from "exceljs";

export const INVENTORY_SHELF_LOCATIONS = [
  "Filipiniana",
  "Reference",
  "Computer Program",
  "Health Care",
  "Business Administration",
  "Hospitality & Tourism Management",
  "Criminal Justice Education",
] as const;

export const INVENTORY_HEADERS = [
  "Inventory Date",
  "Accession Number",
  "Number of Copies",
  "Classification Number",
  "Author Number",
  "Call Number",
  "Title",
  "Author",
  "Copyright Date",
  "Publisher",
  "Edition",
  "Shelf Location",
  "Subject",
  "Price",
] as const;

export type InventoryShelfLocation =
  (typeof INVENTORY_SHELF_LOCATIONS)[number];

export interface InventoryImportRow {
  row_number: number;
  inventory_date: number;
  accession_number: string | null;
  number_of_copies: number;
  classification_number: string;
  author_number: string;
  call_number: string;
  title: string;
  author: string;
  copyright_date: number;
  publisher: string;
  edition: string;
  shelf_location: InventoryShelfLocation;
  subject: string;
  price: number;
}

export interface InventoryRowIssue {
  rowNumber: number;
  message: string;
}

export interface ParsedInventoryFile {
  rows: InventoryImportRow[];
  issues: InventoryRowIssue[];
  worksheetName: string;
}

export interface InventoryExportRow {
  inventory_date: number | null;
  accession_number: string;
  number_of_copies: number;
  classification_number: string;
  author_number: string;
  call_number: string;
  title: string;
  author: string;
  copyright_date: number | null;
  publisher: string;
  edition: string;
  shelf_location: string;
  subject: string;
  price: number;
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("en")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeAccessionNumber(
  value: unknown,
): string | null {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const normalized = String(value)
    .trim()
    .replace(/\.0+$/, "");

  if (!/^\d+$/.test(normalized)) {
    throw new Error(
      "Accession number must contain digits only.",
    );
  }

  return normalized.padStart(4, "0");
}

function parseYear(
  value: unknown,
  fieldName: string,
  required: boolean,
): number | null {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    if (required) {
      throw new Error(`${fieldName} is required.`);
    }

    return null;
  }

  if (value instanceof Date) {
    return value.getFullYear();
  }

  const year = Number(
    String(value).trim().replace(/\.0+$/, ""),
  );
  const currentYear = new Date().getFullYear();

  if (
    !Number.isInteger(year) ||
    year < 1000 ||
    year > currentYear + 1
  ) {
    throw new Error(`${fieldName} is not valid.`);
  }

  return year;
}

function parseNumberOfCopies(value: unknown): number {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return 1;
  }

  const count = Number(
    String(value).trim().replace(/\.0+$/, ""),
  );

  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error(
      "Number of Copies must be a whole number from 1 to 100.",
    );
  }

  return count;
}

function parsePrice(value: unknown): number {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return 0;
  }

  const normalized = String(value).replace(
    /[₱,\s]/g,
    "",
  );
  const price = Number(normalized);

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be zero or greater.");
  }

  return Number(price.toFixed(2));
}

function requireText(
  value: unknown,
  fieldName: string,
): string {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function normalizeClassificationNumber(value: unknown): string {
  const normalized = requireText(
    value,
    "Classification Number",
  ).replace(/\s+/g, "");

  if (!/^\d{3}(?:\.\d{1,10})?$/.test(normalized)) {
    throw new Error(
      "Classification Number must use Dewey format, such as 002 or 005.133.",
    );
  }

  return normalized;
}

function normalizeAuthorNumber(value: unknown): string {
  const normalized = requireText(
    value,
    "Author Number",
  )
    .replace(/\s+/g, "")
    .toUpperCase();

  if (!/^[A-Z0-9]{1,12}$/.test(normalized)) {
    throw new Error(
      "Author Number must contain only letters and numbers, such as 13E3.",
    );
  }

  return normalized;
}

function requireShelfLocation(
  value: unknown,
): InventoryShelfLocation {
  const normalized = requireText(
    value,
    "Shelf Location",
  );

  if (
    !INVENTORY_SHELF_LOCATIONS.includes(
      normalized as InventoryShelfLocation,
    )
  ) {
    throw new Error(
      `Shelf Location must be one of: ${INVENTORY_SHELF_LOCATIONS.join(", ")}.`,
    );
  }

  return normalized as InventoryShelfLocation;
}

function buildCallNumber(
  classificationNumber: string,
  authorNumber: string,
  copyrightYear: number,
): string {
  return `${classificationNumber} ${authorNumber} ${copyrightYear}`;
}

function cellText(cell: {
  value: unknown;
  text: string;
}): string {
  if (cell.value instanceof Date) {
    return String(cell.value.getFullYear());
  }

  return cell.text?.trim() || String(cell.value ?? "").trim();
}

function downloadBlob(
  blob: Blob,
  filename: string,
): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

async function loadExcelJs() {
  const module = await import("exceljs");

  return (
    module.default ?? module
  ) as typeof import("exceljs");
}

export function useLibraryInventoryExcel() {
  async function parseInventoryFile(
    file: File,
  ): Promise<ParsedInventoryFile> {
    if (!import.meta.client) {
      throw new Error(
        "Excel files can only be read in the browser.",
      );
    }

    if (!file.name.toLocaleLowerCase("en").endsWith(".xlsx")) {
      throw new Error(
        "Select an Excel .xlsx file. The older .xls format is not supported.",
      );
    }

    const ExcelJS = await loadExcelJs();
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();

    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error("The workbook does not contain a worksheet.");
    }

    const headerRow = worksheet.getRow(1);
    const headerColumns = new Map<string, number>();

    headerRow.eachCell(
      { includeEmpty: false },
      (cell: Cell, columnNumber: number) => {
        headerColumns.set(
          normalizeHeader(cellText(cell)),
          columnNumber,
        );
      },
    );

    const requiredHeaders = [
      "inventory date",
      "accession number",
      "number of copies",
      "classification number",
      "author number",
      "call number",
      "title",
      "author",
      "copyright date",
      "publisher",
      "edition",
      "shelf location",
      "subject",
      "price",
    ];

    const missingHeaders = requiredHeaders.filter(
      (header) => !headerColumns.has(header),
    );

    if (missingHeaders.length > 0) {
      throw new Error(
        `Missing Excel header${
          missingHeaders.length === 1 ? "" : "s"
        }: ${missingHeaders.join(", ")}. Download the latest import template.`,
      );
    }

    const rows: InventoryImportRow[] = [];
    const issues: InventoryRowIssue[] = [];
    const reservedAccessions = new Map<string, number>();

    for (
      let rowNumber = 2;
      rowNumber <= worksheet.rowCount;
      rowNumber += 1
    ) {
      const row = worksheet.getRow(rowNumber);

      const getValue = (header: string): unknown => {
        const columnNumber = headerColumns.get(header);
        return columnNumber ? cellText(row.getCell(columnNumber)) : "";
      };

      const rawValues = requiredHeaders.map(getValue);
      const isBlank = rawValues.every(
        (value) => String(value ?? "").trim() === "",
      );

      if (isBlank) {
        continue;
      }

      try {
        const inventoryDate = parseYear(
          getValue("inventory date"),
          "Inventory date",
          true,
        );
        const accessionNumber = normalizeAccessionNumber(
          getValue("accession number"),
        );
        const numberOfCopies = parseNumberOfCopies(
          getValue("number of copies"),
        );
        const classificationNumber = normalizeClassificationNumber(
          getValue("classification number"),
        );
        const authorNumber = normalizeAuthorNumber(
          getValue("author number"),
        );
        const copyrightDate = parseYear(
          getValue("copyright date"),
          "Copyright date",
          true,
        );
        const shelfLocation = requireShelfLocation(
          getValue("shelf location"),
        );

        if (accessionNumber) {
          const startingSequence = Number.parseInt(
            accessionNumber,
            10,
          );

          for (
            let offset = 0;
            offset < numberOfCopies;
            offset += 1
          ) {
            const reserved = String(
              startingSequence + offset,
            ).padStart(4, "0");
            const firstRow = reservedAccessions.get(reserved);

            if (firstRow) {
              throw new Error(
                `Accession number ${reserved} is also included by row ${firstRow}.`,
              );
            }

            reservedAccessions.set(reserved, rowNumber);
          }
        }

        rows.push({
          row_number: rowNumber,
          inventory_date: inventoryDate!,
          accession_number: accessionNumber,
          number_of_copies: numberOfCopies,
          classification_number: classificationNumber,
          author_number: authorNumber,
          call_number: buildCallNumber(
            classificationNumber,
            authorNumber,
            copyrightDate!,
          ),
          title: requireText(getValue("title"), "Title"),
          author: requireText(getValue("author"), "Author"),
          copyright_date: copyrightDate!,
          publisher: String(getValue("publisher") ?? "").trim(),
          edition: String(getValue("edition") ?? "").trim(),
          shelf_location: shelfLocation,
          subject: String(getValue("subject") ?? "").trim(),
          price: parsePrice(getValue("price")),
        });
      } catch (error) {
        issues.push({
          rowNumber,
          message:
            error instanceof Error
              ? error.message
              : "The row is invalid.",
        });
      }
    }

    if (rows.length === 0 && issues.length === 0) {
      throw new Error(
        "The worksheet does not contain inventory records.",
      );
    }

    return {
      rows,
      issues,
      worksheetName: worksheet.name,
    };
  }

  async function downloadImportTemplate(): Promise<void> {
    if (!import.meta.client) {
      return;
    }

    const ExcelJS = await loadExcelJs();
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "SNCBT Library Management System";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(
      "Library Inventory",
      {
        views: [
          {
            state: "frozen",
            ySplit: 1,
          },
        ],
      },
    );

    const widths = [
      16, 20, 18, 24, 18, 30, 42, 30, 18, 30, 20, 38, 34, 16,
    ];

    worksheet.columns = INVENTORY_HEADERS.map((header, index) => ({
      header,
      key: normalizeHeader(header).replace(/\s+/g, "_"),
      width: widths[index],
      ...(header === "Accession Number" ? { style: { numFmt: "@" } } : {}),
      ...(header === "Price" ? { style: { numFmt: "₱#,##0.00" } } : {}),
    }));

    const currentYear = new Date().getFullYear();
    const sample = worksheet.addRow({
      inventory_date: currentYear,
      accession_number: "0001",
      number_of_copies: 2,
      classification_number: "002",
      author_number: "13E3",
      title: "Sample Book Title",
      author: "Sample Author",
      copyright_date: currentYear,
      publisher: "Sample Publisher",
      edition: "1st Edition",
      shelf_location: "Computer Program",
      subject: "Information Technology",
      price: 0,
    });
    sample.getCell(6).value = {
      formula: `D${sample.number}&" "&E${sample.number}&" "&I${sample.number}`,
      result: `002 13E3 ${currentYear}`,
    };

    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF047857" },
    };
    headerRow.alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    worksheet.autoFilter = {
      from: "A1",
      to: "N1",
    };

    for (let row = 2; row <= 5000; row += 1) {
      worksheet.getCell(`F${row}`).value = {
        formula: `IF(OR(D${row}="",E${row}="",I${row}=""),"",D${row}&" "&E${row}&" "&I${row})`,
      };
      worksheet.getCell(`F${row}`).protection = { locked: true };
      worksheet.getCell(`L${row}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [
          `"${INVENTORY_SHELF_LOCATIONS.join(",")}"`,
        ],
        showErrorMessage: true,
        errorTitle: "Invalid shelf location",
        error: "Select one of the approved shelf locations.",
      };
      worksheet.getCell(`C${row}`).dataValidation = {
        type: "whole",
        operator: "between",
        formulae: [1, 100],
        showErrorMessage: true,
        errorTitle: "Invalid number of copies",
        error: "Enter a whole number from 1 to 100.",
      };
      worksheet.getCell(`B${row}`).numFmt = "@";
      worksheet.getCell(`N${row}`).numFmt = "₱#,##0.00";
    }

    const instructions = workbook.addWorksheet("Instructions");
    instructions.columns = [
      { width: 30 },
      { width: 96 },
    ];

    instructions.addRows([
      ["Rule", "Description"],
      [
        "One row = one book title",
        "Use Number of Copies to create all physical copies for the title in one import row.",
      ],
      [
        "Classification Number",
        "Enter the Dewey Decimal Classification number using three digits, with an optional decimal extension. Examples: 002, 005.133, or 650.",
      ],
      [
        "Author Number",
        "Enter the Library author number/code using letters and numbers only. Example: 13E3.",
      ],
      [
        "Call Number",
        "Generated automatically from Classification Number + Author Number + Copyright Date. Example: 002 13E3 2025. Do not edit this column.",
      ],
      [
        "Shelf Location",
        "Select the physical shelf where every copy from the row will be stored. This replaces the previous Category field.",
      ],
      [
        "Subject",
        "Optional subject or topic of the book.",
      ],
      [
        "Accession Number",
        "This is the first accession number for the row. For 3 copies starting at 0001, the system creates 0001, 0002, and 0003. Leave it blank for automatic numbering.",
      ],
      [
        "Barcode",
        "The barcode contains the accession number only. Example: accession number 0001 produces barcode value 0001.",
      ],
      [
        "Price",
        "The price is applied to every physical copy. Use 0.00 for donated books.",
      ],
    ]);

    const instructionsHeader = instructions.getRow(1);
    instructionsHeader.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    instructionsHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF047857" },
    };
    instructions.eachRow((row: Row) => {
      row.alignment = {
        vertical: "top",
        wrapText: true,
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    downloadBlob(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "SNCBT-Library-Inventory-Import-Template-v3.xlsx",
    );
  }

  async function downloadInventoryExport(
    rows: InventoryExportRow[],
  ): Promise<void> {
    if (!import.meta.client) {
      return;
    }

    const ExcelJS = await loadExcelJs();
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "SNCBT Library Management System";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(
      "Library Inventory",
      {
        views: [
          {
            state: "frozen",
            ySplit: 1,
          },
        ],
      },
    );

    const widths = [
      16, 20, 18, 24, 18, 30, 42, 30, 18, 30, 20, 38, 34, 16,
    ];

    worksheet.columns = INVENTORY_HEADERS.map((header, index) => ({
      header,
      key: normalizeHeader(header).replace(/\s+/g, "_"),
      width: widths[index],
      ...(header === "Accession Number" ? { style: { numFmt: "@" } } : {}),
      ...(header === "Price" ? { style: { numFmt: "₱#,##0.00" } } : {}),
    }));

    worksheet.addRows(
      rows.map((row) => ({
        inventory_date: row.inventory_date ?? "",
        accession_number: row.accession_number,
        number_of_copies: row.number_of_copies,
        classification_number: row.classification_number,
        author_number: row.author_number,
        call_number: row.call_number,
        title: row.title,
        author: row.author,
        copyright_date: row.copyright_date ?? "",
        publisher: row.publisher,
        edition: row.edition,
        shelf_location: row.shelf_location,
        subject: row.subject,
        price: row.price,
      })),
    );

    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF047857" },
    };
    headerRow.alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    worksheet.autoFilter = {
      from: "A1",
      to: "N1",
    };

    for (let row = 2; row <= worksheet.rowCount; row += 1) {
      worksheet.getCell(`B${row}`).numFmt = "@";
      worksheet.getCell(`N${row}`).numFmt = "₱#,##0.00";
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);

    downloadBlob(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `SNCBT-Library-Inventory-${date}.xlsx`,
    );
  }

  return {
    parseInventoryFile,
    downloadImportTemplate,
    downloadInventoryExport,
  };
}
