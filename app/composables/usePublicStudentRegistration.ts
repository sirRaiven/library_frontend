export type StudentEducationalLevel =
  | "College"
  | "Diploma"
  | "Senior High School";

export interface PublicRegistrationConfig {
  enabled: boolean;
  institutionName: string;
  libraryName: string;
  institutionAddress: string;
  contactEmail: string;
  contactNumber: string;
  academicYear: string;
  semester:
    | "First Semester"
    | "Second Semester"
    | "Summer";
  membershipValidityMonths: number;
  requireEnrollmentVerification: boolean;
  defaultLibraryCardStatus: string;
  usernameRule: string;
  passwordRules: {
    minimumLength: number;
    maximumLength: number;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    symbol: boolean;
  };
}

export interface PublicStudentRegistrationInput {
  code: string;
  website?: string;
  student: {
    studentNo: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    sex?: "Male" | "Female" | "";
    educationalLevel: StudentEducationalLevel;
    course: string;
    yearLevel: number;
    section?: string;
    email: string;
    contactNo: string;
    address?: string;
  };
  membership: {
    enrollmentReference?: string;
  };
  account: {
    password: string;
    passwordConfirmation: string;
  };
  agreementAccepted: boolean;
}

export interface PublicRegistrationResult {
  registered: true;
  username: string;
  email: string;
  studentNo: string;
  studentName: string;
  libraryCardNo: string;
  membershipNo: string;
  academicYear: string;
  semester: string;
  membershipStatus: string;
  enrollmentVerified: boolean;
  librarianReviewRequired: boolean;
  loginUrl: string;
  message: string;
}

export interface CredentialAssistanceInput {
  code: string;
  website?: string;
  studentNo: string;
  fullName: string;
  email: string;
  contactNo: string;
  assistanceType:
    | "Forgot Username"
    | "Forgot Password"
    | "Forgot Username and Password"
    | "Cannot Sign In";
}

export interface LibrarianRegistrationLink {
  url: string;
  expiresAt: string | null;
  enabled: boolean;
  instructions: string;
}


export interface CredentialReviewResult {
  student: {
    documentId: string;
    studentNo: string;
    fullName: string;
    email: string | null;
    contactNo: string | null;
    course: string | null;
    yearLevel: number | null;
    section: string | null;
    status: string | null;
    libraryCardNo: string | null;
  };
  account: {
    linked: boolean;
    id: number | null;
    username: string | null;
    email: string | null;
    confirmed: boolean;
    blocked: boolean;
    role: string | null;
  };
  membership: {
    membershipNo: string | null;
    academicYear: string | null;
    semester: string | null;
    status: string | null;
    enrollmentVerified: boolean;
    expiryDate: string | null;
  } | null;
  verificationRequired: true;
  allowedVerificationMethods: string[];
}

export interface CredentialResetInput {
  verificationMethod: string;
  reason: string;
  passwordMode: "Generated" | "Manual";
  temporaryPassword?: string;
  temporaryPasswordConfirmation?: string;
}

export interface CredentialResetResult {
  reset: true;
  username: string;
  email: string;
  temporaryPassword: string;
  passwordMode: "Generated" | "Manual";
  revokedAuthenticationSessions: number;
  invalidatedTrackedSessions: number;
  message: string;
}

interface ApiResponse<T> {
  data: T;
}

interface FetchErrorLike {
  data?: {
    error?: {
      message?: string;
      details?: {
        code?: string;
      };
    };
  };
  response?: {
    _data?: {
      error?: {
        message?: string;
        details?: {
          code?: string;
        };
      };
    };
  };
  message?: string;
}

function errorPayload(error: unknown) {
  const candidate = error as FetchErrorLike;
  return candidate?.data?.error ?? candidate?.response?._data?.error;
}

export function usePublicStudentRegistration() {
  const runtimeConfig = useRuntimeConfig();
  const auth = useAuth();
  const baseUrl = String(
    runtimeConfig.public.strapiUrl ?? "",
  ).replace(/\/$/, "");

  async function validateAccess(code: string) {
    const response = await $fetch<ApiResponse<PublicRegistrationConfig>>(
      `${baseUrl}/api/public-student-registration/access`,
      {
        method: "POST",
        body: { code },
        credentials: "include",
      },
    );

    return response.data;
  }

  async function register(input: PublicStudentRegistrationInput) {
    const response = await $fetch<ApiResponse<PublicRegistrationResult>>(
      `${baseUrl}/api/public-student-registration/register`,
      {
        method: "POST",
        body: { data: input },
        credentials: "include",
      },
    );

    return response.data;
  }

  async function requestCredentialAssistance(
    input: CredentialAssistanceInput,
  ) {
    const response = await $fetch<
      ApiResponse<{ accepted: true; message: string }>
    >(
      `${baseUrl}/api/public-student-registration/credential-assistance`,
      {
        method: "POST",
        body: { data: input },
        credentials: "include",
      },
    );

    return response.data;
  }

  async function loadLibrarianLink() {
    const response = await auth.authFetch<
      ApiResponse<LibrarianRegistrationLink>
    >("/api/public-student-registration/librarian-link");

    return response.data;
  }


  async function loadCredentialReview(studentNo: string) {
    const response = await auth.authFetch<
      ApiResponse<CredentialReviewResult>
    >(
      `/api/public-student-registration/credential-review/${encodeURIComponent(studentNo)}`,
    );

    return response.data;
  }

  async function resetCredentialPassword(
    studentNo: string,
    input: CredentialResetInput,
  ) {
    const response = await auth.authFetch<
      ApiResponse<CredentialResetResult>
    >(
      `/api/public-student-registration/credential-review/${encodeURIComponent(studentNo)}/reset-password`,
      {
        method: "POST",
        body: { data: input },
      },
    );

    return response.data;
  }

  function getErrorMessage(error: unknown) {
    return (
      errorPayload(error)?.message ??
      (error as FetchErrorLike)?.message ??
      "The request could not be completed."
    );
  }

  function getErrorCode(error: unknown) {
    return errorPayload(error)?.details?.code ?? "REGISTRATION_ERROR";
  }

  return {
    validateAccess,
    register,
    requestCredentialAssistance,
    loadLibrarianLink,
    loadCredentialReview,
    resetCredentialPassword,
    getErrorMessage,
    getErrorCode,
  };
}
