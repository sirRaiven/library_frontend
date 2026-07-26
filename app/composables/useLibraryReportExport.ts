
import type {
  LibraryReportBranding,
  LibraryReportColumn,
  LibraryReportDocument,
  LibraryReportMetric,
  LibraryReportRow,
  LibraryReportTable,
} from "~/types/libraryReports";

interface LoadedImage {
  dataUrl: string;
  bytes: Uint8Array;
  extension: "png" | "jpeg";
  base64: string;
}

function fileSafe(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function downloadBlob(
  blob: Blob,
  filename: string,
) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(
    () => URL.revokeObjectURL(url),
    1000,
  );
}

function dateValue(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function formatValue(
  value: unknown,
  format:
    | LibraryReportColumn["format"]
    | LibraryReportMetric["format"] = "text",
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  if (format === "number") {
    return new Intl.NumberFormat("en-US").format(
      Number(value) || 0,
    );
  }

  if (format === "currency") {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(value) || 0);
  }

  if (format === "percent") {
    return `${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(Number(value) || 0)}%`;
  }

  if (
    format === "date" ||
    format === "datetime"
  ) {
    const parsed = dateValue(value);

    if (!parsed) {
      return String(value);
    }

    return new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      ...(format === "datetime"
        ? { timeStyle: "short" as const }
        : {}),
      timeZone: "Asia/Manila",
    }).format(parsed);
  }

  return String(value);
}

function totalRows(
  table: LibraryReportTable,
): LibraryReportRow[] {
  return table.totalRow
    ? [...table.rows, table.totalRow]
    : table.rows;
}

async function loadImage(
  source: string,
): Promise<LoadedImage | null> {
  const url = source.trim();

  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const extension =
      blob.type.includes("jpeg") ||
      blob.type.includes("jpg")
        ? "jpeg"
        : "png";

    const dataUrl = await new Promise<string>(
      (resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve(String(reader.result ?? ""));
        reader.onerror = () =>
          reject(reader.error);
        reader.readAsDataURL(blob);
      },
    );

    return {
      dataUrl,
      bytes,
      extension,
      base64:
        dataUrl.split(",")[1] ?? "",
    };
  } catch {
    return null;
  }
}

function reportFilename(
  report: LibraryReportDocument,
  extension: string,
): string {
  const date = new Date()
    .toISOString()
    .slice(0, 10);

  return `${fileSafe(report.title)}-${date}.${extension}`;
}

async function exportPdf(
  report: LibraryReportDocument,
  branding: LibraryReportBranding,
) {
  const [{ jsPDF }, autoTableModule] =
    await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

  const autoTable =
    autoTableModule.default;
  const widest =
    Math.max(
      ...report.tables.map(
        (table) => table.columns.length,
      ),
      1,
    );
  const orientation =
    widest > 7
      ? "landscape"
      : "portrait";

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const [
    institutionLogo,
    libraryLogo,
  ] = await Promise.all([
    loadImage(
      branding.institutionLogoUrl,
    ),
    loadImage(
      branding.libraryLogoUrl,
    ),
  ]);

  const pageWidth =
    doc.internal.pageSize.getWidth();
  const pageHeight =
    doc.internal.pageSize.getHeight();
  const margin = 12;

  function drawHeader(
    pageTitle = report.title,
  ) {
    if (institutionLogo) {
      doc.addImage(
        institutionLogo.dataUrl,
        institutionLogo.extension ===
          "jpeg"
          ? "JPEG"
          : "PNG",
        margin,
        9,
        18,
        18,
      );
    }

    if (libraryLogo) {
      doc.addImage(
        libraryLogo.dataUrl,
        libraryLogo.extension ===
          "jpeg"
          ? "JPEG"
          : "PNG",
        pageWidth - margin - 18,
        9,
        18,
        18,
      );
    }

    doc.setTextColor(11, 38, 66);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(
      branding.schoolName,
      pageWidth / 2,
      12,
      { align: "center" },
    );

    doc.setFontSize(9);
    doc.text(
      branding.officeName,
      pageWidth / 2,
      17,
      { align: "center" },
    );

    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(7.5);
    doc.text(
      branding.address,
      pageWidth / 2,
      21,
      { align: "center" },
    );

    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.6);
    doc.line(
      margin,
      29,
      pageWidth - margin,
      29,
    );

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(
      pageTitle,
      margin,
      37,
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Period: ${report.periodLabel}`,
      margin,
      42,
    );
    doc.text(
      `Generated: ${formatValue(
        report.generatedAt,
        "datetime",
      )}`,
      pageWidth - margin,
      42,
      { align: "right" },
    );
  }

  drawHeader();

  let y = 49;

  if (report.description) {
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(
      report.description,
      pageWidth - margin * 2,
    );
    doc.text(lines, margin, y);
    y += lines.length * 4 + 2;
  }

  if (report.metrics.length > 0) {
    const columns =
      orientation === "landscape"
        ? 4
        : 2;
    const gap = 3;
    const cardWidth =
      (
        pageWidth -
        margin * 2 -
        gap * (columns - 1)
      ) /
      columns;
    const cardHeight = 17;

    report.metrics.forEach(
      (item, index) => {
        const col = index % columns;
        const row = Math.floor(
          index / columns,
        );
        const x =
          margin +
          col * (cardWidth + gap);
        const top =
          y +
          row * (cardHeight + gap);

        doc.setFillColor(
          241,
          245,
          249,
        );
        doc.setDrawColor(
          203,
          213,
          225,
        );
        doc.roundedRect(
          x,
          top,
          cardWidth,
          cardHeight,
          2,
          2,
          "FD",
        );

        doc.setTextColor(
          71,
          85,
          105,
        );
        doc.setFontSize(6.5);
        doc.setFont(
          "helvetica",
          "normal",
        );
        doc.text(
          item.label,
          x + 3,
          top + 5,
        );

        doc.setTextColor(
          15,
          23,
          42,
        );
        doc.setFontSize(10);
        doc.setFont(
          "helvetica",
          "bold",
        );
        const metricText =
          formatValue(
            item.value,
            item.format,
          );
        doc.text(
          doc.splitTextToSize(
            metricText,
            cardWidth - 6,
          )[0] ?? "",
          x + 3,
          top + 12,
        );
      },
    );

    y +=
      Math.ceil(
        report.metrics.length /
        columns,
      ) *
        (cardHeight + gap) +
      2;
  }

  for (
    let tableIndex = 0;
    tableIndex <
    report.tables.length;
    tableIndex += 1
  ) {
    const table =
      report.tables[tableIndex];

    if (y > pageHeight - 45) {
      doc.addPage();
      drawHeader(table.title);
      y = 49;
    }

    doc.setTextColor(
      15,
      23,
      42,
    );
    doc.setFont(
      "helvetica",
      "bold",
    );
    doc.setFontSize(10);
    doc.text(
      table.title,
      margin,
      y,
    );
    y += 4;

    if (table.description) {
      doc.setTextColor(
        100,
        116,
        139,
      );
      doc.setFont(
        "helvetica",
        "normal",
      );
      doc.setFontSize(7);
      const lines =
        doc.splitTextToSize(
          table.description,
          pageWidth -
            margin * 2,
        );
      doc.text(
        lines,
        margin,
        y,
      );
      y +=
        lines.length * 3.2 +
        1;
    }

    autoTable(doc, {
      startY: y,
      head: [
        table.columns.map(
          (item) => item.label,
        ),
      ],
      body: totalRows(table).map(
        (row, rowIndex) =>
          table.columns.map(
            (item) =>
              formatValue(
                row[item.key],
                item.format,
              ),
          ),
      ),
      margin: {
        left: margin,
        right: margin,
        bottom: 15,
      },
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize:
          table.columns.length >
          10
            ? 5.8
            : 7,
        cellPadding: 1.4,
        lineColor: [
          203,
          213,
          225,
        ],
        lineWidth: 0.15,
        overflow:
          "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [
          11,
          38,
          66,
        ],
        textColor: [
          255,
          255,
          255,
        ],
        fontStyle: "bold",
      },
      didParseCell(data) {
        if (
          table.totalRow &&
          data.section ===
            "body" &&
          data.row.index ===
            table.rows.length
        ) {
          data.cell.styles.fontStyle =
            "bold";
          data.cell.styles.fillColor =
            [226, 232, 240];
        }
      },
    });

    y =
      (doc as any)
        .lastAutoTable
        .finalY +
      8;
  }

  if (report.notes?.length) {
    if (y > pageHeight - 35) {
      doc.addPage();
      drawHeader("Report Notes");
      y = 49;
    }

    doc.setFont(
      "helvetica",
      "bold",
    );
    doc.setFontSize(9);
    doc.setTextColor(
      15,
      23,
      42,
    );
    doc.text(
      "Notes",
      margin,
      y,
    );
    y += 4;

    doc.setFont(
      "helvetica",
      "normal",
    );
    doc.setFontSize(7);
    doc.setTextColor(
      71,
      85,
      105,
    );

    for (const note of report.notes) {
      const lines =
        doc.splitTextToSize(
          `• ${note}`,
          pageWidth -
            margin * 2,
        );
      doc.text(
        lines,
        margin,
        y,
      );
      y +=
        lines.length * 3.2 +
        1;
    }
  }


  if (
    branding.signatoryName.trim()
  ) {
    if (
      y >
      pageHeight - 34
    ) {
      doc.addPage();
      drawHeader(
        "Certification",
      );
      y = 55;
    }

    const centerX =
      pageWidth -
      margin -
      34;

    doc.setDrawColor(
      71,
      85,
      105,
    );
    doc.line(
      centerX - 28,
      y + 9,
      centerX + 28,
      y + 9,
    );

    doc.setTextColor(
      15,
      23,
      42,
    );
    doc.setFont(
      "helvetica",
      "bold",
    );
    doc.setFontSize(8);
    doc.text(
      branding.signatoryName,
      centerX,
      y + 14,
      {
        align: "center",
      },
    );

    doc.setFont(
      "helvetica",
      "normal",
    );
    doc.setTextColor(
      71,
      85,
      105,
    );
    doc.setFontSize(7);
    doc.text(
      branding.signatoryTitle,
      centerX,
      y + 18,
      {
        align: "center",
      },
    );
  }

  const pageCount =
    doc.getNumberOfPages();

  for (
    let page = 1;
    page <= pageCount;
    page += 1
  ) {
    doc.setPage(page);
    doc.setDrawColor(
      203,
      213,
      225,
    );
    doc.line(
      margin,
      pageHeight - 10,
      pageWidth - margin,
      pageHeight - 10,
    );
    doc.setFontSize(6.5);
    doc.setTextColor(
      100,
      116,
      139,
    );
    doc.text(
      `Prepared by: ${branding.preparedBy || "SNCBT Library"}`,
      margin,
      pageHeight - 6,
    );
    doc.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: "right" },
    );
  }

  doc.save(
    reportFilename(
      report,
      "pdf",
    ),
  );
}

async function exportDocx(
  report: LibraryReportDocument,
  branding: LibraryReportBranding,
) {
  const docx: any =
    await import("docx");
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    ImageRun,
    PageNumber,
    PageOrientation,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = docx;

  const [
    institutionLogo,
    libraryLogo,
  ] = await Promise.all([
    loadImage(
      branding.institutionLogoUrl,
    ),
    loadImage(
      branding.libraryLogoUrl,
    ),
  ]);

  const imageRun = (
    image: LoadedImage | null,
  ) =>
    image
      ? new ImageRun({
          data: image.bytes,
          type:
            image.extension ===
            "jpeg"
              ? "jpg"
              : "png",
          transformation: {
            width: 58,
            height: 58,
          },
        })
      : new TextRun("");

  const headerTable =
    new Table({
      width: {
        size: 100,
        type:
          WidthType.PERCENTAGE,
      },
      borders: {
        top: {
          style:
            BorderStyle.NONE,
          size: 0,
          color: "FFFFFF",
        },
        bottom: {
          style:
            BorderStyle.SINGLE,
          size: 8,
          color: "0EA5E9",
        },
        left: {
          style:
            BorderStyle.NONE,
          size: 0,
          color: "FFFFFF",
        },
        right: {
          style:
            BorderStyle.NONE,
          size: 0,
          color: "FFFFFF",
        },
        insideHorizontal: {
          style:
            BorderStyle.NONE,
          size: 0,
          color: "FFFFFF",
        },
        insideVertical: {
          style:
            BorderStyle.NONE,
          size: 0,
          color: "FFFFFF",
        },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: {
                size: 16,
                type:
                  WidthType.PERCENTAGE,
              },
              children: [
                new Paragraph({
                  alignment:
                    AlignmentType.CENTER,
                  children: [
                    imageRun(
                      institutionLogo,
                    ),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: {
                size: 68,
                type:
                  WidthType.PERCENTAGE,
              },
              children: [
                new Paragraph({
                  alignment:
                    AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text:
                        branding.schoolName,
                      bold: true,
                      size: 24,
                      color: "0B2642",
                    }),
                  ],
                }),
                new Paragraph({
                  alignment:
                    AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text:
                        branding.officeName,
                      bold: true,
                      size: 19,
                      color: "0F766E",
                    }),
                  ],
                }),
                new Paragraph({
                  alignment:
                    AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text:
                        branding.address,
                      size: 15,
                      color: "64748B",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: {
                size: 16,
                type:
                  WidthType.PERCENTAGE,
              },
              children: [
                new Paragraph({
                  alignment:
                    AlignmentType.CENTER,
                  children: [
                    imageRun(
                      libraryLogo,
                    ),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

  const metricCells =
    report.metrics.map(
      (item) =>
        new TableCell({
          shading: {
            type:
              ShadingType.CLEAR,
            fill: "F1F5F9",
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text:
                    item.label,
                  size: 15,
                  color: "64748B",
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text:
                    formatValue(
                      item.value,
                      item.format,
                    ),
                  bold: true,
                  size: 22,
                  color: "0F172A",
                }),
              ],
            }),
          ],
        }),
    );

  const metricRows: any[] = [];
  const metricColumns = 3;

  for (
    let index = 0;
    index < metricCells.length;
    index += metricColumns
  ) {
    const cells = metricCells.slice(
      index,
      index + metricColumns,
    );

    while (
      cells.length <
      metricColumns
    ) {
      cells.push(
        new TableCell({
          children: [
            new Paragraph(""),
          ],
        }),
      );
    }

    metricRows.push(
      new TableRow({
        children: cells,
      }),
    );
  }

  const children: any[] = [
    new Paragraph({
      spacing: {
        before: 220,
        after: 80,
      },
      children: [
        new TextRun({
          text: report.title,
          bold: true,
          size: 30,
          color: "0F172A",
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text:
            report.description,
          size: 18,
          color: "475569",
        }),
      ],
    }),
    new Paragraph({
      spacing: {
        before: 80,
        after: 180,
      },
      children: [
        new TextRun({
          text:
            `Period: ${report.periodLabel}`,
          size: 16,
          color: "475569",
        }),
        new TextRun({
          text:
            `    Generated: ${formatValue(
              report.generatedAt,
              "datetime",
            )}`,
          size: 16,
          color: "475569",
        }),
      ],
    }),
  ];

  if (metricRows.length > 0) {
    children.push(
      new Table({
        width: {
          size: 100,
          type:
            WidthType.PERCENTAGE,
        },
        rows: metricRows,
      }),
      new Paragraph(""),
    );
  }

  for (const table of report.tables) {
    children.push(
      new Paragraph({
        spacing: {
          before: 200,
          after: 80,
        },
        children: [
          new TextRun({
            text: table.title,
            bold: true,
            size: 22,
            color: "0B2642",
          }),
        ],
      }),
    );

    if (table.description) {
      children.push(
        new Paragraph({
          spacing: {
            after: 80,
          },
          children: [
            new TextRun({
              text:
                table.description,
              size: 16,
              color: "64748B",
            }),
          ],
        }),
      );
    }

    const rows = [
      new TableRow({
        tableHeader: true,
        children:
          table.columns.map(
            (item) =>
              new TableCell({
                shading: {
                  type:
                    ShadingType.CLEAR,
                  fill: "0B2642",
                },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text:
                          item.label,
                        bold: true,
                        color:
                          "FFFFFF",
                        size: 14,
                      }),
                    ],
                  }),
                ],
              }),
          ),
      }),
      ...totalRows(table).map(
        (
          row,
          rowIndex,
        ) =>
          new TableRow({
            children:
              table.columns.map(
                (item) =>
                  new TableCell({
                    shading:
                      table.totalRow &&
                      rowIndex ===
                        table.rows.length
                        ? {
                            type:
                              ShadingType.CLEAR,
                            fill:
                              "E2E8F0",
                          }
                        : undefined,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text:
                              formatValue(
                                row[
                                  item.key
                                ],
                                item.format,
                              ),
                            bold:
                              Boolean(
                                table.totalRow &&
                                rowIndex ===
                                  table.rows.length,
                              ),
                            size: 13,
                          }),
                        ],
                      }),
                    ],
                  }),
              ),
          }),
      ),
    ];

    children.push(
      new Table({
        width: {
          size: 100,
          type:
            WidthType.PERCENTAGE,
        },
        rows,
      }),
    );
  }

  if (report.notes?.length) {
    children.push(
      new Paragraph({
        spacing: {
          before: 240,
          after: 80,
        },
        children: [
          new TextRun({
            text: "Notes",
            bold: true,
            size: 20,
          }),
        ],
      }),
      ...report.notes.map(
        (note) =>
          new Paragraph({
            bullet: {
              level: 0,
            },
            children: [
              new TextRun({
                text: note,
                size: 15,
              }),
            ],
          }),
      ),
    );
  }


  if (
    branding.signatoryName.trim()
  ) {
    children.push(
      new Paragraph({
        spacing: {
          before: 360,
          after: 20,
        },
        alignment:
          AlignmentType.RIGHT,
        children: [
          new TextRun({
            text:
              "____________________________",
            size: 16,
            color: "475569",
          }),
        ],
      }),
      new Paragraph({
        alignment:
          AlignmentType.RIGHT,
        children: [
          new TextRun({
            text:
              branding.signatoryName,
            bold: true,
            size: 17,
          }),
        ],
      }),
      new Paragraph({
        alignment:
          AlignmentType.RIGHT,
        children: [
          new TextRun({
            text:
              branding.signatoryTitle,
            size: 15,
            color: "64748B",
          }),
        ],
      }),
    );
  }

  const widest =
    Math.max(
      ...report.tables.map(
        (table) => table.columns.length,
      ),
      1,
    );

  const document =
    new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                orientation:
                  widest > 7
                    ? PageOrientation.LANDSCAPE
                    : PageOrientation.PORTRAIT,
              },
              margin: {
                top: 800,
                right: 650,
                bottom: 720,
                left: 650,
              },
            },
          },
          headers: {
            default:
              new Header({
                children: [
                  headerTable,
                ],
              }),
          },
          footers: {
            default:
              new Footer({
                children: [
                  new Paragraph({
                    alignment:
                      AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text:
                          `Prepared by: ${branding.preparedBy || "SNCBT Library"}    |    Page `,
                        size: 14,
                        color: "64748B",
                      }),
                      new TextRun({
                        children: [
                          PageNumber.CURRENT,
                        ],
                        size: 14,
                        color: "64748B",
                      }),
                      new TextRun({
                        text: " of ",
                        size: 14,
                        color: "64748B",
                      }),
                      new TextRun({
                        children: [
                          PageNumber.TOTAL_PAGES,
                        ],
                        size: 14,
                        color: "64748B",
                      }),
                    ],
                  }),
                ],
              }),
          },
          children,
        },
      ],
    });

  const blob =
    await Packer.toBlob(
      document,
    );

  downloadBlob(
    blob,
    reportFilename(
      report,
      "docx",
    ),
  );
}

function worksheetName(
  value: string,
  existing: Set<string>,
): string {
  const base =
    value
      .replace(
        /[\\/*?:[\]]/g,
        " ",
      )
      .trim()
      .slice(0, 31) ||
    "Report";

  let candidate = base;
  let suffix = 2;

  while (
    existing.has(candidate)
  ) {
    const suffixText =
      ` ${suffix}`;
    candidate =
      `${base.slice(
        0,
        31 -
          suffixText.length,
      )}${suffixText}`;
    suffix += 1;
  }

  existing.add(candidate);
  return candidate;
}

async function exportXlsx(
  report: LibraryReportDocument,
  branding: LibraryReportBranding,
) {
  const module: any =
    await import("exceljs");
  const ExcelJS =
    module.default ?? module;
  const workbook =
    new ExcelJS.Workbook();

  workbook.creator =
    branding.preparedBy ||
    "SNCBT Library";
  workbook.company =
    branding.schoolName;
  workbook.created =
    new Date();

  const [
    institutionLogo,
    libraryLogo,
  ] = await Promise.all([
    loadImage(
      branding.institutionLogoUrl,
    ),
    loadImage(
      branding.libraryLogoUrl,
    ),
  ]);

  const imageIds: {
    institution?: number;
    library?: number;
  } = {};

  if (institutionLogo) {
    imageIds.institution =
      workbook.addImage({
        base64:
          institutionLogo.base64,
        extension:
          institutionLogo.extension,
      });
  }

  if (libraryLogo) {
    imageIds.library =
      workbook.addImage({
        base64:
          libraryLogo.base64,
        extension:
          libraryLogo.extension,
      });
  }

  const existingNames =
    new Set<string>();

  function prepareHeader(
    sheet: any,
    lastColumn: number,
    title: string,
  ) {
    const lastLetter =
      sheet.getColumn(
        lastColumn,
      ).letter;

    sheet.mergeCells(
      `B1:${lastLetter}1`,
    );
    sheet.mergeCells(
      `B2:${lastLetter}2`,
    );
    sheet.mergeCells(
      `B3:${lastLetter}3`,
    );
    sheet.mergeCells(
      `A5:${lastLetter}5`,
    );
    sheet.mergeCells(
      `A6:${lastLetter}6`,
    );

    sheet.getCell("B1").value =
      branding.schoolName;
    sheet.getCell("B2").value =
      branding.officeName;
    sheet.getCell("B3").value =
      branding.address;
    sheet.getCell("A5").value =
      title;
    sheet.getCell("A6").value =
      `Period: ${report.periodLabel}    Generated: ${formatValue(
        report.generatedAt,
        "datetime",
      )}`;

    for (const address of [
      "B1",
      "B2",
      "B3",
      "A5",
      "A6",
    ]) {
      sheet.getCell(address)
        .alignment = {
          horizontal:
            address.startsWith("B")
              ? "center"
              : "left",
          vertical: "middle",
        };
    }

    sheet.getCell("B1").font = {
      bold: true,
      size: 15,
      color: {
        argb: "FF0B2642",
      },
    };
    sheet.getCell("B2").font = {
      bold: true,
      size: 12,
      color: {
        argb: "FF0F766E",
      },
    };
    sheet.getCell("B3").font = {
      size: 9,
      color: {
        argb: "FF64748B",
      },
    };
    sheet.getCell("A5").font = {
      bold: true,
      size: 14,
      color: {
        argb: "FF0F172A",
      },
    };
    sheet.getCell("A6").font = {
      size: 9,
      color: {
        argb: "FF64748B",
      },
    };

    sheet.getRow(1).height = 22;
    sheet.getRow(2).height = 18;
    sheet.getRow(3).height = 16;
    sheet.getRow(5).height = 24;

    if (
      imageIds.institution !==
      undefined
    ) {
      sheet.addImage(
        imageIds.institution,
        {
          tl: {
            col: 0.1,
            row: 0.1,
          },
          ext: {
            width: 58,
            height: 58,
          },
        },
      );
    }

    if (
      imageIds.library !==
      undefined
    ) {
      sheet.addImage(
        imageIds.library,
        {
          tl: {
            col:
              Math.max(
                lastColumn - 1,
                1,
              ) +
              0.15,
            row: 0.1,
          },
          ext: {
            width: 58,
            height: 58,
          },
        },
      );
    }

    sheet.views = [
      {
        state: "frozen",
        ySplit: 7,
      },
    ];
    sheet.pageSetup = {
      orientation:
        lastColumn > 7
          ? "landscape"
          : "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    };
    sheet.headerFooter = {
      oddFooter:
        `Prepared by: ${branding.preparedBy || "SNCBT Library"}    &P of &N`,
    };
  }

  const summary =
    workbook.addWorksheet(
      worksheetName(
        "Executive Summary",
        existingNames,
      ),
    );

  prepareHeader(
    summary,
    6,
    report.title,
  );

  let rowNumber = 8;

  summary.getCell(
    `A${rowNumber}`,
  ).value = "Summary Metrics";
  summary.getCell(
    `A${rowNumber}`,
  ).font = {
    bold: true,
    size: 12,
    color: {
      argb: "FF0B2642",
    },
  };
  rowNumber += 1;

  const metricHeaders =
    summary.getRow(
      rowNumber,
    );
  metricHeaders.values = [
    "Metric",
    "Value",
    "Description",
  ];
  metricHeaders.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };
  metricHeaders.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF0B2642",
    },
  };
  rowNumber += 1;

  for (const item of report.metrics) {
    const row =
      summary.getRow(
        rowNumber,
      );
    row.values = [
      item.label,
      item.value,
      item.description ?? "",
    ];

    if (
      item.format ===
      "currency"
    ) {
      row.getCell(2).numFmt =
        '"₱"#,##0.00';
    } else if (
      item.format ===
      "number"
    ) {
      row.getCell(2).numFmt =
        "#,##0";
    }

    rowNumber += 1;
  }


  if (
    branding.signatoryName.trim()
  ) {
    rowNumber += 2;
    summary.getCell(
      `A${rowNumber}`,
    ).value =
      "Certified / Approved By";
    summary.getCell(
      `A${rowNumber}`,
    ).font = {
      bold: true,
      color: {
        argb: "FF64748B",
      },
    };

    rowNumber += 2;
    summary.getCell(
      `A${rowNumber}`,
    ).value =
      branding.signatoryName;
    summary.getCell(
      `A${rowNumber}`,
    ).font = {
      bold: true,
      size: 11,
    };

    rowNumber += 1;
    summary.getCell(
      `A${rowNumber}`,
    ).value =
      branding.signatoryTitle;
  }

  summary.columns = [
    { width: 30 },
    { width: 20 },
    { width: 55 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ];

  for (const table of report.tables) {
    const sheet =
      workbook.addWorksheet(
        worksheetName(
          table.title,
          existingNames,
        ),
      );

    prepareHeader(
      sheet,
      Math.max(
        table.columns.length,
        3,
      ),
      table.title,
    );

    if (table.description) {
      const lastLetter =
        sheet.getColumn(
          Math.max(
            table.columns.length,
            3,
          ),
        ).letter;
      sheet.mergeCells(
        `A7:${lastLetter}7`,
      );
      sheet.getCell("A7").value =
        table.description;
      sheet.getCell(
        "A7",
      ).alignment = {
        wrapText: true,
      };
      sheet.getRow(7).height =
        28;
    }

    const headerRow =
      sheet.getRow(8);
    headerRow.values =
      table.columns.map(
        (item) => item.label,
      );
    headerRow.font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
    };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF0B2642",
      },
    };
    headerRow.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    headerRow.height = 30;

    totalRows(table).forEach(
      (reportRow, index) => {
        const row =
          sheet.getRow(
            9 + index,
          );
        row.values =
          table.columns.map(
            (item) =>
              reportRow[
                item.key
              ] ??
              "",
          );
        row.alignment = {
          vertical: "top",
          wrapText: true,
        };

        table.columns.forEach(
          (
            item,
            columnIndex,
          ) => {
            const cell =
              row.getCell(
                columnIndex + 1,
              );

            if (
              item.format ===
              "currency"
            ) {
              cell.numFmt =
                '"₱"#,##0.00';
            } else if (
              item.format ===
              "number"
            ) {
              cell.numFmt =
                "#,##0";
            } else if (
              item.format ===
                "date" ||
              item.format ===
                "datetime"
            ) {
              const parsed =
                dateValue(
                  cell.value,
                );

              if (parsed) {
                cell.value =
                  parsed;
                cell.numFmt =
                  item.format ===
                  "datetime"
                    ? "mmm d, yyyy h:mm AM/PM"
                    : "mmm d, yyyy";
              }
            }
          },
        );

        if (
          table.totalRow &&
          index ===
            table.rows.length
        ) {
          row.font = {
            bold: true,
          };
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "FFE2E8F0",
            },
          };
        }
      },
    );

    table.columns.forEach(
      (item, index) => {
        sheet.getColumn(
          index + 1,
        ).width =
          item.width ??
          Math.min(
            Math.max(
              item.label.length +
                3,
              14,
            ),
            36,
          );
      },
    );

    sheet.autoFilter = {
      from: {
        row: 8,
        column: 1,
      },
      to: {
        row: 8,
        column:
          table.columns.length,
      },
    };
  }

  const buffer =
    await workbook.xlsx.writeBuffer();

  downloadBlob(
    new Blob([buffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    reportFilename(
      report,
      "xlsx",
    ),
  );
}

export function useLibraryReportExport() {
  async function exportReport(
    format:
      | "pdf"
      | "docx"
      | "xlsx",
    report: LibraryReportDocument,
    branding: LibraryReportBranding,
  ) {
    if (!import.meta.client) {
      throw new Error(
        "Report export is available only in the browser.",
      );
    }

    if (format === "pdf") {
      return exportPdf(
        report,
        branding,
      );
    }

    if (format === "docx") {
      return exportDocx(
        report,
        branding,
      );
    }

    return exportXlsx(
      report,
      branding,
    );
  }

  return {
    exportReport,
    formatValue,
  };
}
