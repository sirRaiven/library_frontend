import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("production Excel template generation contract", () => {
  it("generates the inventory template server-side without weakening the browser CSP", () => {
    const composable = read("app/composables/useLibraryInventoryExcel.ts");
    const route = read("server/routes/__sncbt/excel/inventory-template.post.ts");
    const config = read("nuxt.config.ts");

    const templateFunction = composable.slice(
      composable.indexOf("async function downloadImportTemplate"),
      composable.indexOf("async function downloadInventoryExport"),
    );

    expect(templateFunction).toContain('fetch(\n      "/__sncbt/excel/inventory-template"');
    expect(templateFunction).not.toContain("loadExcelJs()");
    expect(templateFunction).not.toContain("workbook.xlsx.writeBuffer");
    expect(route).toContain('await import("exceljs")');
    expect(route).toContain("workbook.xlsx.writeBuffer()");
    expect(route).toContain("Content-Disposition");
    expect(route).toContain("Cache-Control");
    expect(config).toContain('? "\'self\' \'unsafe-inline\' \'wasm-unsafe-eval\'"');
    expect(config).not.toContain('? "\'self\' \'unsafe-inline\' \'unsafe-eval\'');
  });

  it("validates registry option payloads before workbook generation", () => {
    const route = read("server/routes/__sncbt/excel/inventory-template.post.ts");

    expect(route).toContain("normalizeRegistryOptions");
    expect(route).toContain("unique.length > 250");
    expect(route).toContain("item.length > 120");
  });
});
