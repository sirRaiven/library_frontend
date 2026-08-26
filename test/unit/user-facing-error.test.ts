import { describe, expect, it } from "vitest";
import {
  errorCode,
  errorStatus,
  userFacingErrorMessage,
  signInErrorMessage,
  registrationErrorMessage,
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
      "Something went wrong while processing the request. Please try again.",
    );
    expect(message.toLowerCase()).not.toContain("postgres");
    expect(message).not.toContain("api::");
  });

  it("shows a clear and safe invalid-credentials message", () => {
    expect(
      signInErrorMessage({
        statusCode: 400,
        data: { error: { message: "Invalid identifier or password" } },
      }),
    ).toBe("The username/email or password is incorrect.");
  });

  it("uses domain-friendly maintenance and registration messages", () => {
    expect(
      userFacingErrorMessage({
        statusCode: 503,
        data: { error: { details: { code: "SYSTEM_MAINTENANCE_READ_ONLY" } } },
      }),
    ).toBe("This action is unavailable while the system is under maintenance.");

    expect(
      registrationErrorMessage({
        statusCode: 409,
        data: { error: { message: "Student account already exists." } },
      }),
    ).toContain("registration or account already exists");
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
