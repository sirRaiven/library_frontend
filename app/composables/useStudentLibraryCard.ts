import { appLogger } from "~/utils/app-logger";

import type {
  LibraryCardDesign,
} from "~/composables/useLibraryCardDesign";

export interface StudentLibraryCardData {
  generatedAt: string;
  institution: {
    name: string;
    libraryName: string;
    address: string;
    contactEmail: string;
    contactNumber: string;
  };
  student: {
    documentId: string;
    studentNo: string;
    libraryCardNo: string | null;
    barcode: string | null;
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
    fullName: string;
    sex: "Male" | "Female" | null;
    educationalLevel: string;
    course: string;
    yearLevel: number | null;
    section: string | null;
    email: string | null;
    contactNo: string | null;
    address: string | null;
    photoUrl: string | null;
    studentStatus: string;
    libraryCardStatus: string;
    libraryCardReleaseDate: string | null;
  };
  membership: {
    documentId: string | null;
    membershipNo: string | null;
    academicYear: string | null;
    semester: string | null;
    issuedDate: string | null;
    expiryDate: string | null;
    status: string;
    renewalType: string;
    enrollmentVerified: boolean;
    verifiedAt: string | null;
    daysRemaining: number | null;
    isActive: boolean;
  };
  eligibility: {
    canUseDigitalCard: boolean;
    canDownload: boolean;
    canPrint: boolean;
    reasons: string[];
  };
  renewal: {
    required: boolean;
    onlineRenewalAvailable: boolean;
    requirements: string[];
    message: string;
  };
  design: {
    name: string;
    config: Partial<LibraryCardDesign>;
    updatedAt: string | null;
  };
  usageNotice: string[];
}

type LibraryCardActivity = "download" | "print";

function statusCode(error: unknown): number | undefined {
  const value = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };

  return value.response?.status ?? value.statusCode ?? value.status;
}

export function useStudentLibraryCard() {
  const auth = useAuth();
  const session = useStudentSession();
  const route = useRoute();

  const card = useState<StudentLibraryCardData | null>(
    "student-library-card-record",
    () => null,
  );
  const loading = useState("student-library-card-loading", () => false);
  const error = useState("student-library-card-error", () => "");

  function requestHeaders(): HeadersInit | undefined {
    return session.sessionKey.value
      ? { "X-Student-Session": session.sessionKey.value }
      : undefined;
  }

  async function handleUnauthorized(caught: unknown) {
    if (statusCode(caught) !== 401) return false;

    auth.clearSession();
    await navigateTo({
      path: "/",
      query: { redirect: route.fullPath },
    });
    return true;
  }

  async function load() {
    if (loading.value) return card.value;

    loading.value = true;
    error.value = "";

    try {
      const response = await auth.authFetch<{
        data: StudentLibraryCardData;
      }>("/api/student-portal/library-card", {
        method: "GET",
        headers: requestHeaders(),
      });

      card.value = response.data;
      return response.data;
    } catch (caught) {
      if (await handleUnauthorized(caught)) return null;

      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      loading.value = false;
    }
  }

  async function recordActivity(action: LibraryCardActivity) {
    try {
      await auth.authFetch(
        "/api/student-portal/library-card/activity",
        {
          method: "POST",
          headers: requestHeaders(),
          body: {
            data: { action },
          },
        },
      );
    } catch (caught) {
      if (await handleUnauthorized(caught)) return;
      appLogger.warn("Unable to record Library Card activity.", caught);
    }
  }

  function reset() {
    card.value = null;
    error.value = "";
  }

  return {
    card,
    loading,
    error,
    load,
    recordActivity,
    reset,
  };
}
