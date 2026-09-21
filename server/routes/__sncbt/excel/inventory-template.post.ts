import { createError, defineEventHandler, readBody, setResponseHeader } from "h3";
import type { Cell, Row } from "exceljs";

const INVENTORY_HEADERS = [
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
  "Book Category",
  "Shelf Location",
  "Subject",
  "Price",
] as const;

interface InventoryTemplateBody {
  bookCategories?: unknown;
  shelfLocations?: unknown;
}

function normalizeRegistryOptions(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label} options are required.`,
    });
  }

  const normalized = value
    .map((item) => String(item ?? "").trim().replace(/[\u0000-\u001F\u007F]/g, ""))
    .filter(Boolean);

  const unique = [...new Set(normalized)];

  if (unique.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label} options are unavailable.`,
    });
  }

  if (unique.length > 250 || unique.some((item) => item.length > 120)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label} options are not valid for template generation.`,
    });
  }

  return unique;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<InventoryTemplateBody>(event);
  const bookCategories = normalizeRegistryOptions(body?.bookCategories, "Book Category");
  const shelfLocations = normalizeRegistryOptions(body?.shelfLocations, "Shelf Location");

  // Keep ExcelJS on the server. The browser production CSP intentionally does
  // not permit unsafe-eval, while older ExcelJS browser bundles use dynamic
  // Function construction internally. Server-side generation preserves the
  // strict CSP and produces the exact same workbook features reliably.
  const module = await import("exceljs");
  const ExcelJS = (module.default ?? module) as typeof import("exceljs");
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "SNCBT Library Management System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Library Inventory", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const widths = [
    16, 20, 18, 24, 18, 30, 42, 30, 18, 30, 20, 30, 38, 34, 16,
  ];

  worksheet.columns = INVENTORY_HEADERS.map((header, index) => ({
    header,
    key: header.toLowerCase().replace(/\s+/g, "_"),
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
    book_category: bookCategories[0] ?? "",
    shelf_location: shelfLocations[0] ?? "",
    subject: "Information Technology",
    price: 0,
  });

  // worksheet columns use normalized header keys, so assign the sample values
  // explicitly where the registry-backed columns differ from legacy keys.
  sample.getCell(12).value = bookCategories[0] ?? "";
  sample.getCell(13).value = shelfLocations[0] ?? "";
  sample.getCell(6).value = {
    formula: `D${sample.number}&" "&E${sample.number}&" "&I${sample.number}`,
    result: `002 13E3 ${currentYear}`,
  } as Cell["value"];

  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF047857" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  worksheet.autoFilter = { from: "A1", to: "O1" };

  const optionSheet = workbook.addWorksheet("Dropdown Options");
  optionSheet.state = "veryHidden";
  optionSheet.getCell("A1").value = "Book Category";
  optionSheet.getCell("B1").value = "Shelf Location";

  bookCategories.forEach((option, index) => {
    optionSheet.getCell(index + 2, 1).value = option;
  });
  shelfLocations.forEach((option, index) => {
    optionSheet.getCell(index + 2, 2).value = option;
  });

  for (let row = 2; row <= 5000; row += 1) {
    worksheet.getCell(`F${row}`).value = {
      formula: `IF(OR(D${row}="",E${row}="",I${row}=""),"",D${row}&" "&E${row}&" "&I${row})`,
    } as Cell["value"];
    worksheet.getCell(`F${row}`).protection = { locked: true };
    worksheet.getCell(`L${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`'Dropdown Options'!$A$2:$A$${bookCategories.length + 1}`],
      showErrorMessage: true,
      errorTitle: "Invalid book category",
      error: "Select an active Book Category.",
    };
    worksheet.getCell(`M${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`'Dropdown Options'!$B$2:$B$${shelfLocations.length + 1}`],
      showErrorMessage: true,
      errorTitle: "Invalid shelf location",
      error: "Select an active Shelf Location.",
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
    worksheet.getCell(`O${row}`).numFmt = "₱#,##0.00";
  }

  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [{ width: 30 }, { width: 96 }];
  instructions.addRows([
    ["Rule", "Description"],
    ["One row = one book title", "Use Number of Copies to create all physical copies for the title in one import row."],
    ["Classification Number", "Enter the Dewey Decimal Classification number using three digits, with an optional decimal extension. Examples: 002, 005.133, or 650."],
    ["Author Number", "Enter the Library author number/code using letters and numbers only. Example: 13E3."],
    ["Call Number", "Generated automatically from Classification Number + Author Number + Copyright Date. Example: 002 13E3 2025. Do not edit this column."],
    ["Book Category", "Select the catalog category for the book title. Category is independent from the physical shelf location."],
    ["Shelf Location", "Select the physical shelf where every copy from the row will be stored."],
    ["Subject", "Optional subject or topic of the book."],
    ["Accession Number", "This is the first accession number for the row. For 3 copies starting at 0001, the system creates 0001, 0002, and 0003. Leave it blank for automatic numbering."],
    ["Barcode", "The barcode contains the accession number only. Example: accession number 0001 produces barcode value 0001."],
    ["Price", "The price is applied to every physical copy. Use 0.00 for donated books."],
  ]);

  const instructionsHeader = instructions.getRow(1);
  instructionsHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  instructionsHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF047857" },
  };
  instructions.eachRow((row: Row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();

  setResponseHeader(
    event,
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  setResponseHeader(
    event,
    "Content-Disposition",
    'attachment; filename="SNCBT-Library-Inventory-Import-Template-v3.xlsx"',
  );
  setResponseHeader(event, "Cache-Control", "no-store");

  return buffer;
});
