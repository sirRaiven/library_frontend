import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Phase 34 transactional safety contract", () => {
  it("requires explicit local write confirmation and all transactional fixtures", () => {
    const env = read("test/acceptance/helpers/env.ts");
    const runner = read("scripts/run-library-acceptance.mjs");

    expect(env).toContain("E2E_LOCAL_WRITE_CONFIRMATION");
    expect(env).toContain("I_UNDERSTAND_THIS_MUTATES_LOCAL_TEST_DATA");
    expect(env).toContain("assertTransactionalFixtures");
    expect(runner).toContain("E2E_STUDENT_BARCODE");
    expect(runner).toContain("E2E_AVAILABLE_BOOK_BARCODE");
    expect(runner).toContain("E2E_RESERVATION_BOOK_QUERY");
    expect(runner).toContain("E2E_LOCAL_WRITE_CONFIRMATION");
  });

  it("performs reservation and circulation cleanup from finally blocks", () => {
    const source = read("test/acceptance/write-workflows.acceptance.test.ts");

    expect(source).toContain("cleanupReservation");
    expect(source).toContain("cleanupBorrowing");
    expect(source).toContain("reservationMayExist");
    expect(source).toContain("borrowingMayExist");
    expect(source).toContain("finally");
    expect(source).not.toContain("Run the return workflow manually");
  });
});
