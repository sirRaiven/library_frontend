import { describe, expect, it } from "vitest";
import {
  errorCode,
  errorStatus,
  userFacingErrorMessage,
} from "../../app/utils/user-facing-error";

describe("user-facing error sanitizer", () => {
  it("extracts HTTP status and application error code", () => {
    const error = {
      response: {
        status: 403,
        _data: {
          error: {
            details: { code: "DEVICE_BLOCKED" },
          },
        },
      },
    };

    expect(errorStatus(error)).toBe(403);
    expect(errorCode(error)).toBe("DEVICE_BLOCKED");
  });

  it("does not expose technical backend/database messages", () => {
    const message = userFacingErrorMessage({
      statusCode: 500,
      data: {
        error: {
          message: "PostgreSQL duplicate key constraint in api::student.student",
        },
      },
    });

    expect(message).toBe(
      "The Library System could not complete the request. Please try again.",
    );
    expect(message.toLowerCase()).not.toContain("postgres");
    expect(message).not.toContain("api::");
  });

  it("preserves safe validation messages", () => {
    expect(
      userFacingErrorMessage({
        statusCode: 400,
        data: { message: "Student number is required." },
      }),
    ).toBe("Student number is required.");
  });

  it("uses safe status-specific messages", () => {
    expect(userFacingErrorMessage({ statusCode: 401 })).toBe(
      "Your session has expired. Please sign in again.",
    );
    expect(userFacingErrorMessage({ statusCode: 429 })).toBe(
      "Too many requests were made. Please wait a moment and try again.",
    );
  });
});
