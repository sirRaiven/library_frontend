import { userFacingErrorMessage } from "~/utils/user-facing-error";

import type { StudentEducationalLevel } from "~/constants/studentPrograms";

export type StudentAccessRequestType =
  | "Registration"
  | "Credential Recovery";

export type StudentAccessRequestStatus =
  | "Pending Verification"
  | "Verified"
  | "Completed"
  | "Rejected"
  | "Cancelled";

export interface RegistrationAccessDetails {
  valid: true;
  expiresAt: string | null;
  institution: {
    name: string;
    libraryName: string;
    address: string;
    contactEmail: string;
    contactNumber: string;
  };
  membership: {
    academicYear: string;
    semester: string;
    termStatus: "Open" | "Closed";
    registrationOpen: boolean;
    validFrom: string;
    validUntil: string | null;
    enrollmentVerificationRequired: boolean;
  };
}

export interface RegistrationPhotoPayload {
  data: string;
  mimeType: string;
  fileName: string;
}

export interface PublicStudentRegistrationInput {
  student: {
    studentNo: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    sex?: "Male" | "Female";
    educationalLevel: StudentEducationalLevel;
    course: string;
    yearLevel: number;
    section?: string;
    email: string;
    contactNo?: string;
    address?: string;
  };
  membership: {
    enrollmentReference?: string;
  };
  account: {
    password: string;
    confirmPassword: string;
  };
  photo: RegistrationPhotoPayload;
  privacyNoticeAccepted: boolean;
  termsAccepted: boolean;
}

export interface StudentRegistrationResult {
  requestNo: string;
  studentNo: string;
  username: string;
  email: string;
  libraryCardNo: string;
  accountCreated: boolean;
  canSignIn: boolean;
  verificationRequired: boolean;
  message: string;
}

export interface CredentialHelpInput {
  studentNo: string;
  firstName: string;
  lastName: string;
  email?: string;
  contactNo?: string;
  privacyNoticeAccepted: boolean;
}

export interface CredentialHelpResult {
  requestNo: string;
  submitted: true;
  message: string;
}

export interface StudentAccessRequest {
  documentId: string;
  requestNo: string;
  type: StudentAccessRequestType;
  status: StudentAccessRequestStatus;
  studentNo: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  fullName: string;
  sex: string;
  educationalLevel: string;
  course: string;
  yearLevel: number | null;
  section: string;
  email: string;
  contactNo: string;
  address: string;
  portalUsername: string;
  academicYear: string;
  semester: string;
  enrollmentReference: string;
  photoPreviewUrl?: string | null;
  hasPhoto: boolean;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
  source: "QR Registration" | "Credential Assistance";
  student: {
    documentId: string;
    studentNo: string;
    fullName: string;
    status: string;
    libraryCardNo?: string | null;
    libraryCardStatus?: string | null;
    photoUrl?: string | null;
  } | null;
  account: {
    id: number;
    username: string;
    email: string;
    confirmed: boolean;
    blocked: boolean;
  } | null;
}

interface RequestListResponse {
  data: StudentAccessRequest[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
    summary: {
      pendingRegistrations: number;
      approvedRegistrations: number;
      rejectedRegistrations: number;
      pendingCredentialRequests: number;
    };
  };
}

interface AccessLinkResult {
  token: null;
  expiresAt: null;
  expiresInHours: null;
  registrationPath: string;
  registrationUrl: string;
  url: string;
  link: string;
  registrationLink: string;
  enabled: true;
}

interface ResetCredentialResult {
  request: StudentAccessRequest;
  credentials: {
    username: string;
    email: string;
    temporaryPassword: string;
    passwordMode: "Generated" | "Manual";
  };
  warning: string;
}

function errorMessage(error: unknown): string {
  return userFacingErrorMessage(
    error,
    "The request could not be completed. Please try again.",
  );
}

export function useStudentSelfRegistration() {
  const config = useRuntimeConfig();
  const auth = useAuth();
  const apiBase = String(config.public.strapiUrl).replace(/\/$/, "");

  async function publicFetch<T>(
    path: string,
    options: {
      method?: "GET" | "POST";
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
    } = {},
  ): Promise<T> {
    return await $fetch<T>(`${apiBase}${path}`, {
      ...options,
      credentials: "include",
    });
  }

  async function fileToPhotoPayload(file: File): Promise<RegistrationPhotoPayload> {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("The Student photo could not be read."));
      reader.readAsDataURL(file);
    });

    return {
      data,
      mimeType: file.type || "image/jpeg",
      fileName: file.name || "student-library-card-photo.jpg",
    };
  }

  async function validateAccess(): Promise<RegistrationAccessDetails> {
    const response = await publicFetch<{ data: RegistrationAccessDetails }>(
      "/api/public-student-registration/access",
    );
    return response.data;
  }

  async function register(
    input: PublicStudentRegistrationInput,
  ): Promise<StudentRegistrationResult> {
    const response = await publicFetch<{ data: StudentRegistrationResult }>(
      "/api/public-student-registration/register",
      {
        method: "POST",
        body: { data: input },
      },
    );
    return response.data;
  }

  async function requestCredentialHelp(
    input: CredentialHelpInput,
  ): Promise<CredentialHelpResult> {
    const response = await publicFetch<{ data: CredentialHelpResult }>(
      "/api/public-student-registration/credential-help",
      {
        method: "POST",
        body: { data: input },
      },
    );
    return response.data;
  }

  async function createAccessLink(): Promise<AccessLinkResult> {
    const response = await auth.authFetch<{ data: AccessLinkResult }>(
      "/api/public-student-registration/librarian-link",
    );
    return response.data;
  }

  async function listRequests(filters: {
    type?: StudentAccessRequestType;
    status?: StudentAccessRequestStatus | "All";
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<RequestListResponse> {
    return await auth.authFetch<RequestListResponse>(
      "/api/public-student-registration/requests",
      {
        query: {
          type: filters.type,
          status: filters.status === "All" ? undefined : filters.status,
          search: filters.search,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 20,
        },
      },
    );
  }

  async function getRequest(documentId: string): Promise<StudentAccessRequest> {
    const response = await auth.authFetch<{ data: StudentAccessRequest }>(
      `/api/public-student-registration/requests/${documentId}`,
    );
    return response.data;
  }

  async function verifyRegistration(
    documentId: string,
    data: { notes?: string },
  ): Promise<StudentAccessRequest> {
    const response = await auth.authFetch<{ data: StudentAccessRequest }>(
      `/api/public-student-registration/requests/${documentId}/verify`,
      { method: "POST", body: { data } },
    );
    return response.data;
  }

  async function rejectRequest(
    documentId: string,
    reason: string,
  ): Promise<StudentAccessRequest> {
    const response = await auth.authFetch<{ data: StudentAccessRequest }>(
      `/api/public-student-registration/requests/${documentId}/reject`,
      { method: "POST", body: { data: { reason } } },
    );
    return response.data;
  }

  async function resetCredentials(
    documentId: string,
    data: {
      reason: string;
      identityConfirmed: boolean;
      passwordMode: "Generated" | "Manual";
      temporaryPassword?: string;
      confirmTemporaryPassword?: string;
    },
  ): Promise<ResetCredentialResult> {
    const response = await auth.authFetch<{ data: ResetCredentialResult }>(
      `/api/public-student-registration/requests/${documentId}/reset-password`,
      { method: "POST", body: { data } },
    );
    return response.data;
  }

  return {
    validateAccess,
    fileToPhotoPayload,
    register,
    requestCredentialHelp,
    createAccessLink,
    listRequests,
    getRequest,
    verifyRegistration,
    rejectRequest,
    resetCredentials,
    errorMessage,
  };
}
