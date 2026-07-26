
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


function escapeHtml(
  value: unknown,
): string {
  return String(
    value ?? "",
  )
    .replace(
      /&/g,
      "&amp;",
    )
    .replace(
      /</g,
      "&lt;",
    )
    .replace(
      />/g,
      "&gt;",
    )
    .replace(
      /"/g,
      "&quot;",
    )
    .replace(
      /'/g,
      "&#039;",
    );
}

function absoluteAssetUrl(
  source: string,
): string {
  const value =
    source.trim();

  if (!value) {
    return "";
  }

  try {
    return new URL(
      value,
      window.location.origin,
    ).href;
  } catch {
    return value;
  }
}

function printReportHtml(
  report: LibraryReportDocument,
  branding: LibraryReportBranding,
): string {
  const widestTable =
    Math.max(
      ...report.tables.map(
        (table) =>
          table.columns.length,
      ),
      1,
    );

  const orientation =
    widestTable > 7
      ? "landscape"
      : "portrait";

  const institutionLogo =
    absoluteAssetUrl(
      branding.institutionLogoUrl,
    );

  const libraryLogo =
    absoluteAssetUrl(
      branding.libraryLogoUrl,
    );

  const logoMarkup = (
    source: string,
    alt: string,
  ) =>
    source
      ? `<img src="${escapeHtml(
          source,
        )}" alt="${escapeHtml(
          alt,
        )}" />`
      : `<div class="logo-placeholder"></div>`;

  const tables =
    report.tables
      .map((table) => {
        const rows =
          totalRows(table);

        return `
          <section class="table-section">
            <div class="table-heading">
              <div>
                <h2>${escapeHtml(
                  table.title,
                )}</h2>
                ${
                  table.description
                    ? `<p>${escapeHtml(
                        table.description,
                      )}</p>`
                    : ""
                }
              </div>
              <span>${table.rows.length} record${
                table.rows.length === 1
                  ? ""
                  : "s"
              }</span>
            </div>

            <table>
              <thead>
                <tr>
                  ${table.columns
                    .map(
                      (column) =>
                        `<th class="${escapeHtml(
                          column.align ??
                            "left",
                        )}">${escapeHtml(
                          column.label,
                        )}</th>`,
                    )
                    .join("")}
                </tr>
              </thead>

              <tbody>
                ${rows
                  .map(
                    (
                      row,
                      rowIndex,
                    ) => `
                      <tr class="${
                        table.totalRow &&
                        rowIndex ===
                          table.rows.length
                          ? "total-row"
                          : ""
                      }">
                        ${table.columns
                          .map(
                            (
                              column,
                            ) => `
                              <td class="${escapeHtml(
                                column.align ??
                                  "left",
                              )}">
                                ${escapeHtml(
                                  formatValue(
                                    row[
                                      column.key
                                    ],
                                    column.format,
                                  ) || "—",
                                )}
                              </td>
                            `,
                          )
                          .join("")}
                      </tr>
                    `,
                  )
                  .join("")}
              </tbody>
            </table>
          </section>
        `;
      })
      .join("");

  const notes =
    report.notes?.length
      ? `
        <section class="notes">
          <h2>Report Notes</h2>
          <ul>
            ${report.notes
              .map(
                (note) =>
                  `<li>${escapeHtml(
                    note,
                  )}</li>`,
              )
              .join("")}
          </ul>
        </section>
      `
      : "";

  const signatory =
    branding.signatoryName.trim()
      ? `
        <section class="signatory">
          <div class="signature-line"></div>
          <strong>${escapeHtml(
            branding.signatoryName,
          )}</strong>
          <span>${escapeHtml(
            branding.signatoryTitle,
          )}</span>
        </section>
      `
      : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <base href="${escapeHtml(
    `${window.location.origin}/`,
  )}" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />
  <title>${escapeHtml(
    report.title,
  )}</title>

  <style>
    @page {
      size: A4 ${orientation};
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-size: 9pt;
      line-height: 1.35;
    }

    .institution-header {
      display: grid;
      grid-template-columns: 22mm 1fr 22mm;
      align-items: center;
      gap: 4mm;
      padding-bottom: 3mm;
      border-bottom: 1.4pt solid #0b2642;
    }

    .institution-header img,
    .logo-placeholder {
      display: block;
      width: 18mm;
      height: 18mm;
      margin: 0 auto;
      object-fit: contain;
    }

    .institution-copy {
      text-align: center;
    }

    .institution-copy strong {
      display: block;
      color: #0b2642;
      font-size: 12pt;
      letter-spacing: 0.02em;
    }

    .institution-copy span {
      display: block;
      margin-top: 1mm;
      color: #0f766e;
      font-size: 9pt;
      font-weight: 700;
    }

    .institution-copy small {
      display: block;
      margin-top: 1mm;
      color: #64748b;
      font-size: 7.5pt;
    }

    .report-heading {
      padding: 5mm 0 3mm;
    }

    .report-heading h1 {
      margin: 0;
      color: #0f172a;
      font-size: 16pt;
      line-height: 1.15;
    }

    .report-heading p {
      max-width: 180mm;
      margin: 2mm 0 0;
      color: #475569;
      font-size: 8.5pt;
    }

    .report-meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 2mm 8mm;
      margin-top: 3mm;
      padding: 2.5mm 3mm;
      border: 0.5pt solid #cbd5e1;
      background: #f8fafc;
      color: #475569;
      font-size: 7.5pt;
    }

    .metrics {
      display: grid;
      grid-template-columns:
        repeat(4, minmax(0, 1fr));
      gap: 2.5mm;
      margin: 2mm 0 5mm;
    }

    .metric {
      min-height: 18mm;
      padding: 3mm;
      border: 0.5pt solid #cbd5e1;
      border-radius: 2mm;
      background: #f8fafc;
      break-inside: avoid;
    }

    .metric-label {
      color: #64748b;
      font-size: 7pt;
    }

    .metric-value {
      margin-top: 1mm;
      color: #0f172a;
      font-size: 13pt;
      font-weight: 700;
    }

    .metric-description {
      margin-top: 1mm;
      color: #64748b;
      font-size: 6.5pt;
    }

    .table-section {
      margin-top: 5mm;
      break-inside: auto;
    }

    .table-heading {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 6mm;
      margin-bottom: 2mm;
    }

    .table-heading h2,
    .notes h2 {
      margin: 0;
      color: #0b2642;
      font-size: 10pt;
    }

    .table-heading p {
      margin: 1mm 0 0;
      color: #64748b;
      font-size: 7pt;
    }

    .table-heading span {
      flex: none;
      color: #64748b;
      font-size: 7pt;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
      font-size: ${
        widestTable > 10
          ? "6.2pt"
          : widestTable > 7
            ? "7pt"
            : "8pt"
      };
    }

    thead {
      display: table-header-group;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    th,
    td {
      padding: 1.5mm 1.7mm;
      border: 0.45pt solid #cbd5e1;
      vertical-align: top;
      overflow-wrap: anywhere;
    }

    th {
      background: #0b2642;
      color: #ffffff;
      font-size: 6.7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    .total-row td {
      background: #e2e8f0;
      font-weight: 700;
    }

    .left {
      text-align: left;
    }

    .center {
      text-align: center;
    }

    .right {
      text-align: right;
    }

    .notes {
      margin-top: 5mm;
      padding: 3mm 4mm;
      border-left: 2pt solid #0ea5e9;
      background: #f0f9ff;
      break-inside: avoid;
    }

    .notes ul {
      margin: 2mm 0 0;
      padding-left: 5mm;
    }

    .notes li + li {
      margin-top: 1mm;
    }

    .certification {
      display: grid;
      grid-template-columns: 1fr 62mm;
      gap: 8mm;
      align-items: end;
      margin-top: 10mm;
      break-inside: avoid;
    }

    .prepared {
      color: #475569;
      font-size: 7.5pt;
    }

    .signatory {
      text-align: center;
    }

    .signature-line {
      margin-bottom: 2mm;
      border-top: 0.7pt solid #475569;
    }

    .signatory strong,
    .signatory span {
      display: block;
    }

    .signatory span {
      margin-top: 1mm;
      color: #64748b;
      font-size: 7pt;
    }

    .screen-toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      justify-content: flex-end;
      padding: 10px 16px;
      border-bottom: 1px solid #cbd5e1;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(8px);
    }

    .screen-toolbar button {
      padding: 9px 14px;
      border: 0;
      border-radius: 8px;
      background: #0b2642;
      color: #ffffff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    .screen-document {
      max-width: ${
        orientation === "landscape"
          ? "297mm"
          : "210mm"
      };
      min-height: ${
        orientation === "landscape"
          ? "210mm"
          : "297mm"
      };
      margin: 18px auto;
      padding: 10mm;
      background: #ffffff;
      box-shadow:
        0 18px 45px
        rgba(15, 23, 42, 0.18);
    }

    @media print {
      .screen-toolbar {
        display: none !important;
      }

      .screen-document {
        max-width: none;
        min-height: 0;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
    }

    @media screen and (max-width: 900px) {
      .screen-document {
        margin: 0;
        padding: 12px;
        box-shadow: none;
      }
    }
  </style>
</head>

<body>
  <div class="screen-toolbar">
    <button
      type="button"
      onclick="window.print()"
    >
      Print Report
    </button>
  </div>

  <main class="screen-document">
    <article>
      <header class="institution-header">
        <div>
          ${logoMarkup(
            institutionLogo,
            "SNCBT logo",
          )}
        </div>

        <div class="institution-copy">
          <strong>${escapeHtml(
            branding.schoolName,
          )}</strong>
          <span>${escapeHtml(
            branding.officeName,
          )}</span>
          <small>${escapeHtml(
            branding.address,
          )}</small>
        </div>

        <div>
          ${logoMarkup(
            libraryLogo,
            "SNCBT Library logo",
          )}
        </div>
      </header>

      <section class="report-heading">
        <h1>${escapeHtml(
          report.title,
        )}</h1>
        <p>${escapeHtml(
          report.description,
        )}</p>

        <div class="report-meta">
          <span>
            <strong>Reporting period:</strong>
            ${escapeHtml(
              report.periodLabel,
            )}
          </span>

          <span>
            <strong>Prepared:</strong>
            ${escapeHtml(
              formatValue(
                report.generatedAt,
                "datetime",
              ),
            )}
          </span>
        </div>
      </section>

      ${tables}
      ${notes}

      <section class="certification">
        <div class="prepared">
          Prepared by:
          <strong>${escapeHtml(
            branding.preparedBy ||
              "SNCBT Library",
          )}</strong>
        </div>

        ${signatory}
      </section>
    </article>
  </main>

</body>
</html>`;
}

function previewAndPrint(
  report: LibraryReportDocument,
  branding: LibraryReportBranding,
): Promise<void> {
  if (!import.meta.client) {
    return Promise.reject(
      new Error(
        "Print preview is available only in the browser.",
      ),
    );
  }

  const html =
    printReportHtml(
      report,
      branding,
    );

  const blob =
    new Blob(
      [html],
      {
        type:
          "text/html;charset=utf-8",
      },
    );

  const blobUrl =
    URL.createObjectURL(
      blob,
    );

  const frame =
    document.createElement(
      "iframe",
    );

  frame.title =
    `${report.title} Print Preview`;
  frame.setAttribute(
    "aria-hidden",
    "true",
  );

  /*
   * Do not use display:none. Chromium may skip printing a completely hidden
   * frame. The frame is kept off-screen and visually transparent instead.
   */
  Object.assign(
    frame.style,
    {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "1px",
      height: "1px",
      border: "0",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "-1",
    },
  );

  return new Promise(
    (resolve, reject) => {
      let settled = false;
      let fallbackTimer:
        ReturnType<
          typeof window.setTimeout
        > | undefined;

      const cleanup = () => {
        if (fallbackTimer) {
          window.clearTimeout(
            fallbackTimer,
          );
        }

        frame.remove();

        URL.revokeObjectURL(
          blobUrl,
        );
      };

      const finish = () => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        resolve();
      };

      const fail = (
        error: unknown,
      ) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();

        reject(
          error instanceof Error
            ? error
            : new Error(
                "The browser could not open the print preview.",
              ),
        );
      };

      frame.addEventListener(
        "error",
        () => {
          fail(
            new Error(
              "The temporary print document could not be loaded.",
            ),
          );
        },
        {
          once: true,
        },
      );

      frame.addEventListener(
        "load",
        () => {
          const printWindow =
            frame.contentWindow;

          if (!printWindow) {
            fail(
              new Error(
                "The browser did not create the print document window.",
              ),
            );
            return;
          }

          printWindow.addEventListener(
            "afterprint",
            finish,
            {
              once: true,
            },
          );

          /*
           * Give Chromium a brief moment to finish painting the Blob document.
           * iframe.onload fires only after the report images load or fail.
           */
          window.setTimeout(
            () => {
              try {
                printWindow.focus();
                printWindow.print();
              } catch (error) {
                fail(error);
              }
            },
            250,
          );

          /*
           * Fallback cleanup for browsers that do not dispatch afterprint.
           * This does not interrupt the normal Chrome print-preview workflow.
           */
          fallbackTimer =
            window.setTimeout(
              finish,
              120_000,
            );
        },
        {
          once: true,
        },
      );

      frame.src =
        blobUrl;

      document.body.appendChild(
        frame,
      );
    },
  );
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
  ).value =
    "Report Information";
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

  const informationRows = [
    [
      "Reporting Period",
      report.periodLabel,
    ],
    [
      "Generated",
      formatValue(
        report.generatedAt,
        "datetime",
      ),
    ],
    [
      "Description",
      report.description,
    ],
    [
      "Report Tables",
      report.tables.length,
    ],
  ];

  for (
    const [
      label,
      value,
    ] of informationRows
  ) {
    const row =
      summary.getRow(
        rowNumber,
      );

    row.values = [
      label,
      value,
    ];

    row.getCell(1).font = {
      bold: true,
      color: {
        argb: "FF475569",
      },
    };

    row.getCell(2)
      .alignment = {
        wrapText: true,
        vertical: "top",
      };

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
    previewAndPrint,
    formatValue,
  };
}
