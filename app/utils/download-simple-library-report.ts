import { loadExcelJs } from "~/utils/load-exceljs";
import type { SimpleLibraryReport, SimpleReportColumn, SimpleReportValue } from "~/utils/librarian-export-choices";

export type SimpleReportFormat = "pdf" | "xlsx" | "docx";

const school = "St. Nicolas College of Business and Technology";
const department = "Library Department";
const logoUrl = "/sncbt-library-logo.png";
const green = "065F46";

function cellText(value: SimpleReportValue, column: SimpleReportColumn) {
  if (value === null || value === undefined || value === "") return "";
  if (column.format === "currency" && Number.isFinite(Number(value))) {
    return `PHP ${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  }
  if (column.format === "date" || column.format === "datetime") {
    const date = new Date(String(value));
    if (Number.isFinite(date.getTime())) {
      return new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        ...(column.format === "datetime" ? { timeStyle: "short" as const } : {}),
        timeZone: "Asia/Manila",
      }).format(date);
    }
  }
  return String(value);
}

function headerLines(report: SimpleLibraryReport) {
  return [
    `Report date: ${cellText(report.date, { label: "Date", format: "date" })}`,
    report.period && `Period: ${report.period}`,
    report.context,
  ].filter((line): line is string => Boolean(line));
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1_000);
}

async function downloadPdf(report: SimpleLibraryReport, logo: Uint8Array | undefined, filename: string) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const wide = report.tables.some(table => table.columns.length > 6);
  const doc = new jsPDF({ orientation: wide ? "landscape" : "portrait", compress: true });
  const width = doc.internal.pageSize.getWidth();
  const marginWidth = width - 28;
  doc.setFontSize(9);
  const lines: string[] = headerLines(report).flatMap(line => doc.splitTextToSize(line, marginWidth));
  const header = (page: number) => {
    if (logo) doc.addImage(logo, "PNG", 14, 11, 13, 13);
    const left = logo ? 31 : 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor("#172B28");
    doc.text(school, left, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(department, left, 22);
    doc.setDrawColor("#BFD7CB");
    doc.line(14, 28, width - 14, 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(report.title, 14, 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(lines, 14, 42);
    doc.setFontSize(8);
    doc.text(String(page), width - 14, doc.internal.pageSize.getHeight() - 9, { align: "right" });
  };
  const top = 45 + lines.length * 4;
  let y = top;
  let lastHeaderPage = 0;
  for (const table of report.tables) {
    const rows = table.rows.map(row => table.columns.map((column, i) => cellText(row[i], column)));
    autoTable(doc, {
      head: [
        ...(table.title ? [[{ content: table.title, colSpan: table.columns.length }]] : []),
        table.columns.map(column => column.label),
      ],
      body: rows.length ? rows : [[{ content: "No records found", colSpan: table.columns.length }]],
      foot: table.total ? [table.columns.map((column, i) => cellText(table.total?.[i], column))] : undefined,
      showFoot: "lastPage",
      startY: y,
      margin: { top, left: 14, right: 14, bottom: 16 },
      styles: { fontSize: 9, overflow: "linebreak", cellPadding: 2.5 },
      headStyles: { fillColor: "#065F46", textColor: "#FFFFFF" },
      footStyles: { fillColor: "#E7F2EC", textColor: "#172B28" },
      alternateRowStyles: { fillColor: "#F4F7F5" },
      didDrawPage: () => {
        const page = doc.getCurrentPageInfo().pageNumber;
        if (page !== lastHeaderPage) {
          header(page);
          lastHeaderPage = page;
        }
      },
    });
    y = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }
  download(doc.output("blob"), filename);
}

async function downloadExcel(report: SimpleLibraryReport, logo: Uint8Array | undefined, filename: string) {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = department;
  let image: number | undefined;
  if (logo) {
    const base64 = `data:image/png;base64,${btoa(Array.from(logo, byte => String.fromCharCode(byte)).join(""))}`;
    image = workbook.addImage({ base64, extension: "png" });
  }
  report.tables.forEach((table, index) => {
    const sheet = workbook.addWorksheet(index ? `Records ${index + 1}` : "Report");
    const width = Math.max(4, table.columns.length);
    for (let num = 1; num <= width; num++) sheet.getColumn(num).width = num <= table.columns.length ? 23 : 14;
    if (image !== undefined) sheet.addImage(image, {
      tl: { col: 0.08, row: 0.12 },
      br: { col: 0.34, row: 1.78 },
      editAs: "oneCell",
    });
    sheet.mergeCells(1, 2, 1, width);
    sheet.mergeCells(2, 2, 2, width);
    sheet.getCell("B1").value = school;
    sheet.getCell("B1").font = { bold: true, size: 13, color: { argb: "FF172B28" } };
    sheet.getCell("B2").value = department;
    sheet.getRow(1).height = 22;
    sheet.mergeCells(4, 1, 4, width);
    sheet.getCell("A4").value = report.title;
    sheet.getCell("A4").font = { bold: true, size: 14, color: { argb: "FF065F46" } };
    let nextRow = 5;
    for (const line of headerLines(report)) {
      sheet.mergeCells(nextRow, 1, nextRow, width);
      sheet.getCell(nextRow++, 1).value = line;
    }
    if (table.title) sheet.getCell(nextRow++, 1).value = table.title;
    const headerRow = sheet.getRow(++nextRow);
    headerRow.values = table.columns.map(column => column.label);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${green}` } };
      cell.alignment = { wrapText: true };
    });
    sheet.views = [{ state: "frozen", ySplit: nextRow }];
    if (table.rows.length) sheet.autoFilter = { from: { row: nextRow, column: 1 }, to: { row: nextRow + table.rows.length, column: table.columns.length } };
    else sheet.addRow(["No records found"]);
    const add = (row: SimpleReportValue[]) => {
      const result = sheet.addRow(table.columns.map((column, i) => typeof row[i] === "number" ? row[i] : cellText(row[i], column)));
      result.eachCell((cell, i) => {
        cell.alignment = { vertical: "top", wrapText: true };
        if (table.columns[i - 1]?.format === "currency" && typeof cell.value === "number") cell.numFmt = '"PHP "#,##0.00';
      });
      return result;
    };
    table.rows.forEach(add);
    if (table.total) add(table.total).font = { bold: true };
  });
  download(new Blob([await workbook.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

async function downloadWord(report: SimpleLibraryReport, logo: Uint8Array | undefined, filename: string) {
  const { AlignmentType, Document, ImageRun, Packer, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = await import("docx");
  const line = (text: string, bold = false, size = 20, color = "172B28") =>
    new Paragraph({ spacing: { after: 65 }, children: [new TextRun({ text, bold, size, color })] });
  const heading = [
    ...(logo ? [new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new ImageRun({ type: "png", data: logo, transformation: { width: 48, height: 48 } })],
    })] : []),
    line(school, true, 23),
    line(department),
    line(report.title, true, 26, green),
    ...headerLines(report).map(text => line(text, false, 18)),
  ];
  const content = report.tables.flatMap(table => {
    const rows = [
      new TableRow({
        tableHeader: true,
        children: table.columns.map(column => new TableCell({
          shading: { fill: green }, children: [line(column.label, true, 18, "FFFFFF")],
        })),
      }),
      ...(table.rows.length
        ? table.rows.map(row => new TableRow({ children: table.columns.map((column, i) => new TableCell({ children: [line(cellText(row[i], column), false, 18)] })) }))
        : [new TableRow({ children: [new TableCell({ columnSpan: table.columns.length, children: [line("No records found")] })] })]),
      ...(table.total ? [new TableRow({ children: table.columns.map((column, i) => new TableCell({ children: [line(cellText(table.total?.[i], column), true, 18)] })) })] : []),
    ];
    return [
      table.title ? line(table.title, true, 20) : new Paragraph(""),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows, margins: { top: 70, bottom: 70, left: 100, right: 100 } }),
    ];
  });
  const wide = report.tables.some(table => table.columns.length > 6);
  const document = new Document({
    creator: department,
    title: report.title,
    sections: [{
      properties: { page: { size: { orientation: wide ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT } } },
      children: [...heading, ...content],
    }],
  });
  download(await Packer.toBlob(document), filename);
}

export async function downloadSimpleLibraryReport(report: SimpleLibraryReport, format: SimpleReportFormat) {
  const filename = `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${report.date}.${format}`;
  const response = await fetch(logoUrl).catch(() => undefined);
  const logo = response?.ok ? new Uint8Array(await response.arrayBuffer()) : undefined;
  if (format === "pdf") return await downloadPdf(report, logo, filename);
  if (format === "xlsx") return await downloadExcel(report, logo, filename);
  await downloadWord(report, logo, filename);
}
