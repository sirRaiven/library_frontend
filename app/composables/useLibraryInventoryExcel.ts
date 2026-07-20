export const INVENTORY_CATEGORIES = [
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
  "Call Number",
  "Title",
  "Author",
  "Copyright Date",
  "Publisher",
  "Edition",
  "Price",
] as const;

export type InventoryCategory =
  (typeof INVENTORY_CATEGORIES)[number];

export interface InventoryImportRow {
  row_number: number;
  inventory_date: number;
  accession_number: string | null;
  call_number: string;
  title: string;
  author: string;
  copyright_date: number | null;
  publisher: string;
  edition: string;
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
  call_number: string;
  title: string;
  author: string;
  copyright_date: number | null;
  publisher: string;
  edition: string;
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
      (cell, columnNumber) => {
        headerColumns.set(
          normalizeHeader(cellText(cell)),
          columnNumber,
        );
      },
    );

    const requiredHeaders = [
      "inventory date",
      "accession number",
      "call number",
      "title",
      "author",
      "copyright date",
      "publisher",
      "edition",
      "price",
    ];

    const missingHeaders = requiredHeaders.filter(
      (header) => !headerColumns.has(header),
    );

    if (missingHeaders.length > 0) {
      throw new Error(
        `Missing Excel header${
          missingHeaders.length === 1 ? "" : "s"
        }: ${missingHeaders.join(", ")}.`,
      );
    }

    const rows: InventoryImportRow[] = [];
    const issues: InventoryRowIssue[] = [];
    const accessionRows = new Map<string, number>();

    for (
      let rowNumber = 2;
      rowNumber <= worksheet.rowCount;
      rowNumber += 1
    ) {
      const row = worksheet.getRow(rowNumber);

      const getValue = (header: string): unknown => {
        const columnNumber = headerColumns.get(header);

        if (!columnNumber) {
          return "";
        }

        return cellText(row.getCell(columnNumber));
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

        const callNumber = requireText(
          getValue("call number"),
          "Call number",
        );

        if (
          !INVENTORY_CATEGORIES.includes(
            callNumber as InventoryCategory,
          )
        ) {
          throw new Error(
            `Call number must be one of: ${INVENTORY_CATEGORIES.join(", ")}.`,
          );
        }

        if (accessionNumber) {
          const firstRow = accessionRows.get(
            accessionNumber,
          );

          if (firstRow) {
            throw new Error(
              `Accession number ${accessionNumber} is also used on row ${firstRow}.`,
            );
          }

          accessionRows.set(accessionNumber, rowNumber);
        }

        rows.push({
          row_number: rowNumber,
          inventory_date: inventoryDate!,
          accession_number: accessionNumber,
          call_number: callNumber,
          title: requireText(
            getValue("title"),
            "Title",
          ),
          author: requireText(
            getValue("author"),
            "Author",
          ),
          copyright_date: parseYear(
            getValue("copyright date"),
            "Copyright date",
            false,
          ),
          publisher: String(
            getValue("publisher") ?? "",
          ).trim(),
          edition: String(
            getValue("edition") ?? "",
          ).trim(),
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

    worksheet.columns = [
      {
        header: INVENTORY_HEADERS[0],
        key: "inventory_date",
        width: 16,
      },
      {
        header: INVENTORY_HEADERS[1],
        key: "accession_number",
        width: 20,
        style: { numFmt: "@" },
      },
      {
        header: INVENTORY_HEADERS[2],
        key: "call_number",
        width: 38,
      },
      {
        header: INVENTORY_HEADERS[3],
        key: "title",
        width: 42,
      },
      {
        header: INVENTORY_HEADERS[4],
        key: "author",
        width: 30,
      },
      {
        header: INVENTORY_HEADERS[5],
        key: "copyright_date",
        width: 18,
      },
      {
        header: INVENTORY_HEADERS[6],
        key: "publisher",
        width: 30,
      },
      {
        header: INVENTORY_HEADERS[7],
        key: "edition",
        width: 20,
      },
      {
        header: INVENTORY_HEADERS[8],
        key: "price",
        width: 16,
        style: { numFmt: "₱#,##0.00" },
      },
    ];

    worksheet.addRow({
      inventory_date: new Date().getFullYear(),
      accession_number: "0001",
      call_number: "Filipiniana",
      title: "Sample Book Title",
      author: "Sample Author",
      copyright_date: new Date().getFullYear(),
      publisher: "Sample Publisher",
      edition: "1st Edition",
      price: 0,
    });

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
      to: "I1",
    };

    for (let row = 2; row <= 5000; row += 1) {
      worksheet.getCell(`C${row}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [
          `"${INVENTORY_CATEGORIES.join(",")}"`,
        ],
        showErrorMessage: true,
        errorTitle: "Invalid call number",
        error: "Select one of the approved categories.",
      };

      worksheet.getCell(`B${row}`).numFmt = "@";
      worksheet.getCell(`I${row}`).numFmt = "₱#,##0.00";
    }

    const instructions = workbook.addWorksheet("Instructions");
    instructions.columns = [
      { width: 28 },
      { width: 90 },
    ];

    instructions.addRows([
      ["Rule", "Description"],
      [
        "One row = one copy",
        "Each Excel row registers one physical book copy.",
      ],
      [
        "Accession Number",
        "Existing accession numbers are preserved. Leave the cell blank to let the system generate the next available number.",
      ],
      [
        "Call Number",
        "The call number is also used as the Book category and the shelf location.",
      ],
      [
        "Barcode",
        "The barcode is generated automatically from the accession number. No barcode image is stored in Excel.",
      ],
      [
        "Repeated book rows",
        "Rows with the same title, author, call number, copyright date, publisher, and edition are grouped under one Book record with multiple copies.",
      ],
      [
        "Price",
        "Use 0.00 for donated books.",
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
    instructions.eachRow((row) => {
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
      "SNCBT-Library-Inventory-Import-Template.xlsx",
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

    worksheet.columns = [
      {
        header: INVENTORY_HEADERS[0],
        key: "inventory_date",
        width: 16,
      },
      {
        header: INVENTORY_HEADERS[1],
        key: "accession_number",
        width: 20,
        style: { numFmt: "@" },
      },
      {
        header: INVENTORY_HEADERS[2],
        key: "call_number",
        width: 38,
      },
      {
        header: INVENTORY_HEADERS[3],
        key: "title",
        width: 42,
      },
      {
        header: INVENTORY_HEADERS[4],
        key: "author",
        width: 30,
      },
      {
        header: INVENTORY_HEADERS[5],
        key: "copyright_date",
        width: 18,
      },
      {
        header: INVENTORY_HEADERS[6],
        key: "publisher",
        width: 30,
      },
      {
        header: INVENTORY_HEADERS[7],
        key: "edition",
        width: 20,
      },
      {
        header: INVENTORY_HEADERS[8],
        key: "price",
        width: 16,
        style: { numFmt: "₱#,##0.00" },
      },
    ];

    worksheet.addRows(
      rows.map((row) => ({
        inventory_date: row.inventory_date ?? "",
        accession_number: row.accession_number,
        call_number: row.call_number,
        title: row.title,
        author: row.author,
        copyright_date: row.copyright_date ?? "",
        publisher: row.publisher,
        edition: row.edition,
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
      to: "I1",
    };

    for (let row = 2; row <= worksheet.rowCount; row += 1) {
      worksheet.getCell(`B${row}`).numFmt = "@";
      worksheet.getCell(`I${row}`).numFmt = "₱#,##0.00";
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
