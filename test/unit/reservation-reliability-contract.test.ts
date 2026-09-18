import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

function functionBlock(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);

  expect(start, `${startMarker} should exist`).toBeGreaterThanOrEqual(0);
  expect(end, `${endMarker} should exist after ${startMarker}`).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe("Reservation reliability regression contract", () => {
  it("keeps a successful status mutation successful when the follow-up queue refresh fails", () => {
    const source = read("app/pages/librarian/reservations.vue");
    const statusUpdate = functionBlock(
      source,
      "async function confirmStatusUpdate()",
      "function submitSearch()",
    );

    expect(source).toContain("notifyOnError?: boolean");
    expect(source).toContain("showLoading?: boolean");
    expect(source).toContain("notifyOnError = true");
    expect(source).toContain("showLoading = true");
    expect(statusUpdate).toMatch(
      /await\s+loadReservations\(\{\s*notifyOnError:\s*false,\s*showLoading:\s*false,\s*\}\);/,
    );
  });

  it("does not show the generic queue-load error for a silent post-mutation refresh", () => {
    const source = read("app/pages/librarian/reservations.vue");

    expect(source).toContain("if (notifyOnError)");
    expect(source).toContain('title: "Reservations unavailable"');
  });
});
