export type StudentRecordCategory =
  | "all"
  | "borrowing"
  | "return"
  | "reservation"
  | "fine"
  | "visit";

export interface LibrarianStudentRecordProfile {
  documentId: string;
  studentNo: string;
  libraryCardNo: string;
  barcode: string;
  fullName: string;
  educationalLevel: string;
  course: string;
  yearLevel: number | null;
  section: string;
  email: string;
  contactNo: string;
  photoUrl: string | null;
  libraryCardStatus: string;
  libraryCardReleaseDate: string | null;
  status: string;
  membership: {
    documentId: string;
    membershipNo: string;
    academicYear: string;
    semester: string;
    issuedDate: string | null;
    expiryDate: string | null;
    status: string | null;
    renewalType: string | null;
    enrollmentVerified: boolean;
    academicTerm: {
      documentId: string;
      code: string;
      name: string;
      academicYear: string;
      semester: string;
      startDate: string | null;
      endDate: string | null;
      isCurrent: boolean;
      active: boolean;
    } | null;
  } | null;
}

export interface LibrarianStudentRecordSummary {
  totalBorrowings: number;
  activeBorrowings: number;
  returnedBorrowings: number;
  totalReturns: number;
  totalReservations: number;
  activeReservations: number;
  totalFines: number;
  totalTimeIns: number;
  lastTimeIn: string | null;
}

export interface LibrarianStudentRecordActivity {
  id: string;
  category: Exclude<StudentRecordCategory, "all">;
  occurredAt: string;
  title: string;
  description: string;
  reference: string | null;
  status: string;
  actor: string | null;
  member: {
    type: "Student" | "Faculty";
    documentId: string | null;
    identifier: string | null;
    name: string;
  } | null;
  book: {
    documentId: string | null;
    title: string;
    controlNumber: string | null;
  } | null;
  amount: number | null;
}

export interface LibrarianStudentRecordResponse {
  data: {
    student: LibrarianStudentRecordProfile;
    summary: LibrarianStudentRecordSummary;
    activities: LibrarianStudentRecordActivity[];
  };
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
    summary: {
      total: number;
      borrowing: number;
      return: number;
      reservation: number;
      fine: number;
      visit: number;
      account: number;
    };
    filters: {
      search: string | null;
      category: string;
      dateFrom: string | null;
      dateTo: string | null;
      sort: "newest" | "oldest";
      scope: string;
    };
  };
}

export interface LibrarianStudentRecordQuery {
  search?: string;
  category?: StudentRecordCategory;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
}

function encodePath(value: string) {
  return encodeURIComponent(value.trim());
}

export function useLibrarianStudentRecord() {
  const auth = useAuth();
  const config = useRuntimeConfig();

  function resolveMediaUrl(value?: string | null): string | null {
    const url = value?.trim();
    if (!url) return null;

    if (
      /^https?:\/\//i.test(url) ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    ) {
      return url;
    }

    const base = String(config.public.strapiUrl ?? "").replace(/\/+$/, "");
    return `${base}/${url.replace(/^\/+/, "")}`;
  }

  async function load(
    identifier: string,
    query: LibrarianStudentRecordQuery = {},
  ): Promise<LibrarianStudentRecordResponse> {
    const response = await auth.authFetch<LibrarianStudentRecordResponse>(
      `/api/portal-history/student-record/${encodePath(identifier)}`,
      {
        method: "GET",
        query: {
          search: query.search?.trim() || undefined,
          category:
            query.category && query.category !== "all"
              ? query.category
              : "all",
          dateFrom: query.dateFrom || undefined,
          dateTo: query.dateTo || undefined,
          sort: query.sort || "newest",
          page: Math.max(Number(query.page) || 1, 1),
          pageSize: Math.min(Math.max(Number(query.pageSize) || 12, 5), 50),
        },
      },
    );

    response.data.student.photoUrl = resolveMediaUrl(
      response.data.student.photoUrl,
    );

    return response;
  }

  return { load };
}
