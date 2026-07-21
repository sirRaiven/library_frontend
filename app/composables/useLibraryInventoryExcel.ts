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
  "Number of Copies",
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
  number_of_copies: number;
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
  number_of_copies: number;
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

function parseNumberOfCopies(value: unknown): number {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    // Backward compatibility with the previous one-copy-per-row template.
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

    // Number of Copies is optional only for backward compatibility. New
    // templates always include it and default to 1 when left blank.
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
    const reservedAccessions = new Map<string, number>();

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

      const checkHeaders = [
        ...requiredHeaders,
        "number of copies",
      ];

      const rawValues = checkHeaders.map(getValue);
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
        key: "number_of_copies",
        width: 18,
      },
      {
        header: INVENTORY_HEADERS[3],
        key: "call_number",
        width: 38,
      },
      {
        header: INVENTORY_HEADERS[4],
        key: "title",
        width: 42,
      },
      {
        header: INVENTORY_HEADERS[5],
        key: "author",
        width: 30,
      },
      {
        header: INVENTORY_HEADERS[6],
        key: "copyright_date",
        width: 18,
      },
      {
        header: INVENTORY_HEADERS[7],
        key: "publisher",
        width: 30,
      },
      {
        header: INVENTORY_HEADERS[8],
        key: "edition",
        width: 20,
      },
      {
        header: INVENTORY_HEADERS[9],
        key: "price",
        width: 16,
        style: { numFmt: "₱#,##0.00" },
      },
    ];

    worksheet.addRow({
      inventory_date: new Date().getFullYear(),
      accession_number: "0001",
      number_of_copies: 2,
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
      to: "J1",
    };

    for (let row = 2; row <= 5000; row += 1) {
      worksheet.getCell(`D${row}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [
          `"${INVENTORY_CATEGORIES.join(",")}"`,
        ],
        showErrorMessage: true,
        errorTitle: "Invalid call number",
        error: "Select one of the approved categories.",
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
      worksheet.getCell(`J${row}`).numFmt = "₱#,##0.00";
    }

    const instructions = workbook.addWorksheet("Instructions");
    instructions.columns = [
      { width: 30 },
      { width: 92 },
    ];

    instructions.addRows([
      ["Rule", "Description"],
      [
        "One row = one book title",
        "Use Number of Copies to create all physical copies for the title in one import row.",
      ],
      [
        "Accession Number",
        "This is the first accession number for the row. For 3 copies starting at 0001, the system creates 0001, 0002, and 0003. Leave it blank to generate the next available numbers automatically.",
      ],
      [
        "Number of Copies",
        "Enter a whole number from 1 to 100. Older files without this column are still accepted and default to one copy per row.",
      ],
      [
        "Call Number",
        "The call number is also used as the Book category and every copy's shelf location.",
      ],
      [
        "Barcode",
        "Each barcode is generated as LIB-{Inventory Date}-{Accession Number}. Example: LIB-2026-0001.",
      ],
      [
        "Price",
        "The price is applied to every physical copy created from the row. Use 0.00 for donated books.",
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
      "SNCBT-Library-Inventory-Import-Template-v2.xlsx",
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
        key: "number_of_copies",
        width: 18,
      },
      {
        header: INVENTORY_HEADERS[3],
        key: "call_number",
        width: 38,
      },
      {
        header: INVENTORY_HEADERS[4],
        key: "title",
        width: 42,
      },
      {
        header: INVENTORY_HEADERS[5],
        key: "author",
        width: 30,
      },
      {
        header: INVENTORY_HEADERS[6],
        key: "copyright_date",
        width: 18,
      },
      {
        header: INVENTORY_HEADERS[7],
        key: "publisher",
        width: 30,
      },
      {
        header: INVENTORY_HEADERS[8],
        key: "edition",
        width: 20,
      },
      {
        header: INVENTORY_HEADERS[9],
        key: "price",
        width: 16,
        style: { numFmt: "₱#,##0.00" },
      },
    ];

    worksheet.addRows(
      rows.map((row) => ({
        inventory_date: row.inventory_date ?? "",
        accession_number: row.accession_number,
        number_of_copies: row.number_of_copies,
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
      to: "J1",
    };

    for (let row = 2; row <= worksheet.rowCount; row += 1) {
      worksheet.getCell(`B${row}`).numFmt = "@";
      worksheet.getCell(`J${row}`).numFmt = "₱#,##0.00";
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
