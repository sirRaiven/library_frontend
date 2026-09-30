import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const expect = (condition, message) => {
  if (!condition) {
    console.error(`DS-6 specialist workflow verification failed: ${message}`);
    process.exit(1);
  }
};

const specialistPages = [
  "app/pages/librarian/borrow.vue",
  "app/pages/librarian/return.vue",
  "app/pages/librarian/visits.vue",
  "app/pages/librarian/reservations.vue",
  "app/pages/librarian/memberships.vue",
  "app/pages/librarian/books/register.vue",
  "app/pages/librarian/books/import.vue",
  "app/pages/librarian/books/copies.vue",
  "app/pages/librarian/books/print.vue",
  "app/pages/librarian/library-card-designer.vue",
  "app/pages/librarian/library-card-print.vue",
  "app/pages/librarian/reports.vue",
  "app/pages/librarian/faculty-book-reports.vue",
  "app/pages/librarian/student-registration-approvals.vue",
  "app/pages/librarian/student-self-registration.vue",
];

for (const file of specialistPages) {
  const source = read(file);
  expect(source.includes("sncbt-specialist-page"), `${file} must opt into the DS-6 specialist-page scope.`);
}

const borrow = read("app/pages/librarian/borrow.vue");
expect(borrow.includes("handleCameraBarcodeDetected"), "Borrow camera scanner handler missing.");
expect(borrow.includes("confirmBorrowing"), "Borrow confirmation workflow missing.");
expect(borrow.includes("sncbt-workflow-layout"), "Borrow task-first workflow layout missing.");
expect(borrow.includes("2xl:grid-cols-[20rem_minmax(0,1fr)]"), "Borrow two-column layout must wait for wide desktop.");
expect(!borrow.includes('title="Fast checkout"'), "Borrow must not repeat the scanner instructions in a second Fast checkout alert.");

const returns = read("app/pages/librarian/return.vue");
expect(returns.includes("handleCameraBarcodeDetected"), "Return camera scanner handler missing.");
expect(returns.includes("processSelectedReturns"), "Return processing workflow missing.");
expect(returns.includes('aria-label="Today\'s processed returns"'), "Return mobile record view missing.");
expect(returns.includes("hidden overflow-x-auto md:block"), "Return desktop table must remain available above phone width.");

const visits = read("app/pages/librarian/visits.vue");
expect(visits.includes("handleCameraBarcode"), "Library Visits camera scanner handler missing.");
expect(visits.includes("recordTimeIn"), "Library Visits time-in mutation missing.");
expect(visits.includes("sncbt-scanner-row"), "Library Visits scanner row contract missing.");

const memberships = read("app/pages/librarian/memberships.vue");
expect(memberships.includes("handleCameraBarcodeDetected"), "Membership camera lookup missing.");
expect(memberships.includes("renewMembership"), "Membership renewal action missing.");
expect(memberships.includes("sncbt-scanner-station"), "Membership scanner station scope missing.");

const reservations = read("app/pages/librarian/reservations.vue");
expect(reservations.includes("LiveBarcodeScanner"), "Reservation scanner workflow missing.");
expect(reservations.includes("sncbt-specialist-page"), "Reservation specialist containment missing.");

const register = read("app/pages/librarian/books/register.vue");
expect(register.includes("submitRegistration"), "Book registration submit workflow missing.");
expect(register.includes("sncbt-specialist-form"), "Book registration specialist form contract missing.");
expect(register.includes("2xl:grid-cols-[minmax(0,1fr)_22rem]"), "Book registration summary must not squeeze laptop/tablet layouts.");

const inventoryImport = read("app/pages/librarian/books/import.vue");
for (const token of ["importInventory", "downloadImportTemplate", "printImportedBarcodes"]) {
  expect(inventoryImport.includes(token), `Book import workflow token ${token} missing.`);
}
expect(inventoryImport.includes("sncbt-specialist-table-region"), "Book import matrices must use contained specialist table regions.");

const copies = read("app/pages/librarian/books/copies.vue");
expect(copies.includes("loadCopies"), "Physical-copy loader missing.");
expect(copies.includes("printCopies"), "Physical-copy print action missing.");
expect(copies.includes("sncbt-physical-copy-card"), "Physical-copy touch/card treatment missing.");

const barcodePrint = read("app/pages/librarian/books/print.vue");
expect(barcodePrint.includes('format: "CODE128"'), "Barcode label format changed from CODE128.");
expect(barcodePrint.includes("window.print()"), "Barcode print handoff missing.");
expect(barcodePrint.includes("minmax(min(100%, 310px), 1fr)"), "Barcode label preview grid must fit narrow screens without changing print output.");
expect(barcodePrint.includes("sncbt-print-actions"), "Barcode print actions must remain phone reachable.");

const cardDesigner = read("app/pages/librarian/library-card-designer.vue");
for (const token of ["saveDesign", "exportDesign", "importDesign", "sncbt-specialist-page"]) {
  expect(cardDesigner.includes(token), `Library Card Designer token ${token} missing.`);
}
expect(cardDesigner.includes("2xl:grid-cols-[24rem_minmax(0,1fr)]"), "Card Designer split view must wait for wide desktop.");
expect(cardDesigner.includes("bottom: max(0.75rem, env(safe-area-inset-bottom));"), "Card Designer save bar must respect device safe area.");
expect(!cardDesigner.includes("backdrop-filter: blur(16px)"), "Card Designer sticky save bar must not use the retired large blur.");

const cardPrint = read("app/pages/librarian/library-card-print.vue");
for (const token of ["triggerPrint", "Printed", "Released", "sncbt-print-actions"]) {
  expect(cardPrint.includes(token), `Library Card Print workflow token ${token} missing.`);
}
expect(cardPrint.includes("2xl:grid-cols-[minmax(0,1fr)_360px]"), "Card Print settings split must wait for wide desktop.");

const reports = read("app/pages/librarian/reports.vue");
for (const token of ["generateReport", "generateCombinedReport", "printActive", "exportActive('pdf')", "exportActive('docx')", "exportActive('xlsx')"]) {
  expect(reports.includes(token), `Library Reports workflow token ${token} missing.`);
}
expect(reports.includes("2xl:grid-cols-[minmax(0,1fr)_340px]"), "Report builder split must wait for wide desktop.");
expect(reports.includes("sncbt-specialist-table-region"), "Generated report tables must use internal specialist overflow.");

const approvals = read("app/pages/librarian/student-registration-approvals.vue");
for (const token of ["openDetails(request)", "openVerify(request)", "openReject(request)", "openReset(request)", "openCardPrinting(request)"]) {
  expect(approvals.includes(token), `Student approval action ${token} missing.`);
}
expect(approvals.includes('aria-label="Student registration requests"'), "Student approvals need semantic mobile request cards.");
expect(approvals.includes("hidden overflow-x-auto md:block"), "Student approvals desktop table must remain available.");

const registrationQr = read("app/pages/librarian/student-self-registration.vue");
for (const token of ["printQr", "downloadQr", "sncbt-specialist-page"]) {
  expect(registrationQr.includes(token), `Student registration QR workflow token ${token} missing.`);
}

const css = read("app/assets/css/main.css");
for (const token of [
  "Design System v2 — Wave DS-6: specialist workflows",
  ".sncbt-specialist-page",
  ".sncbt-specialist-table-region",
  ".sncbt-print-actions",
  "overscroll-behavior-inline: contain",
]) {
  expect(css.includes(token), `DS-6 CSS token missing: ${token}`);
}

const matrix = read("docs/DS6_SPECIALIST_WORKFLOW_MATRIX.md");
expect(matrix.includes("## Protected workflow contracts"), "DS-6 route/workflow matrix missing protected contracts.");

console.log(`DS-6 specialist workflow verification passed: ${specialistPages.length} specialist routes covered.`);
