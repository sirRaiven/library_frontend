import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { source } from "../helpers/source-files";

const read = (relativePath: string) => source(resolve(process.cwd(), relativePath));

describe("DS-6 specialist workflow contract", () => {
  it("keeps circulation scanner and completion actions intact", () => {
    const borrow = read("app/pages/librarian/borrow.vue");
    const returns = read("app/pages/librarian/return.vue");
    const visits = read("app/pages/librarian/visits.vue");

    expect(borrow).toContain("handleCameraBarcodeDetected");
    expect(borrow).toContain("confirmBorrowing");
    expect(borrow).toContain("sncbt-workflow-layout");
    expect(borrow).not.toContain('title="Fast checkout"');

    expect(returns).toContain("processSelectedReturns");
    expect(returns).toContain('aria-label="Today\'s processed returns"');
    expect(returns).toContain("hidden overflow-x-auto md:block");

    expect(visits).toContain("handleCameraBarcode");
    expect(visits).toContain("recordTimeIn");
    expect(visits).toContain("sncbt-scanner-row");
  });

  it("keeps inventory intake and barcode production responsive without changing workflow actions", () => {
    const register = read("app/pages/librarian/books/register.vue");
    const inventoryImport = read("app/pages/librarian/books/import.vue");
    const copies = read("app/pages/librarian/books/copies.vue");
    const barcodePrint = read("app/pages/librarian/books/print.vue");

    expect(register).toContain("submitRegistration");
    expect(register).toContain("2xl:grid-cols-[minmax(0,1fr)_22rem]");
    expect(inventoryImport).toContain("importInventory");
    expect(inventoryImport).toContain("sncbt-specialist-table-region");
    expect(copies).toContain("printCopies");
    expect(copies).toContain("sncbt-physical-copy-card");
    expect(barcodePrint).toContain('format: "CODE128"');
    expect(barcodePrint).toContain("minmax(min(100%, 310px), 1fr)");
  });

  it("preserves card production, report export and approval actions on phone and desktop", () => {
    const designer = read("app/pages/librarian/library-card-designer.vue");
    const cardPrint = read("app/pages/librarian/library-card-print.vue");
    const reports = read("app/pages/librarian/reports.vue");
    const approvals = read("app/pages/librarian/student-registration-approvals.vue");

    expect(designer).toContain("saveDesign");
    expect(designer).toContain("2xl:grid-cols-[24rem_minmax(0,1fr)]");
    expect(cardPrint).toContain("triggerPrint");
    expect(cardPrint).toContain("sncbt-print-actions");
    expect(reports).toContain("generateCombinedReport");
    expect(reports).toContain("exportActive('xlsx')");
    expect(approvals).toContain('aria-label="Student registration requests"');
    expect(approvals).toContain("openVerify(request)");
    expect(approvals).toContain("openReject(request)");
  });

  it("defines one shared specialist overflow and print-toolbar contract", () => {
    const css = read("app/assets/css/main.css");
    expect(css).toContain("Design System v2 — Wave DS-6: specialist workflows");
    expect(css).toContain(".sncbt-specialist-page");
    expect(css).toContain(".sncbt-specialist-table-region");
    expect(css).toContain(".sncbt-print-actions");
  });
});
