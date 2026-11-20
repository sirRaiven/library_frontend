export async function loadExcelJs() {
  // The browser-only bare build uses native platform primitives and needs
  // the generator runtime for its transpiled workbook operations.
  await import("regenerator-runtime/runtime.js");
  const module = await import("exceljs/dist/exceljs.bare.min.js");
  return (module.default ?? module) as typeof import("exceljs");
}
