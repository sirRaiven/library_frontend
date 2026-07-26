
export type LibraryVisitMemberType =
  | "Student"
  | "Faculty";

export interface LibraryVisitMember {
  documentId: string;
  type: LibraryVisitMemberType;
  identifier: string;
  barcode: string;
  fullName: string;
  programDepartment: string;
  educationalLevel?: string;
  yearLevel?: number | null;
  section?: string;
  photoUrl?: string | null;
  membership?: {
    academicYear: string;
    semester: string;
    expiryDate: string;
  } | null;
}

export interface LibraryVisitRecord {
  documentId: string;
  visitNo: string;
  memberType: LibraryVisitMemberType;
  memberDocumentId: string;
  memberIdentifier: string;
  memberName: string;
  barcode: string;
  programDepartment: string;
  educationalLevel?: string;
  yearLevel?: number | null;
  section?: string;
  timeIn: string;
  visitDate: string;
  recordedBy?: string | null;
  duplicate?: boolean;
  member?: LibraryVisitMember;
}

export interface LibraryVisitSummary {
  totalVisits: number;
  studentVisits: number;
  facultyVisits: number;
  uniqueVisitors: number;
  busiestHour: string | null;
  firstEntryAt: string | null;
  latestEntryAt: string | null;
}

export interface LibraryVisitListResponse {
  data: LibraryVisitRecord[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
    summary: LibraryVisitSummary;
  };
}

interface DataResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

function encodePath(
  value: string,
): string {
  return encodeURIComponent(
    value.trim(),
  );
}

export function useLibraryVisits() {
  const auth = useAuth();
  const config =
    useRuntimeConfig();

  function resolveMediaUrl(
    value?: string | null,
  ): string | null {
    const url =
      value?.trim();

    if (!url) {
      return null;
    }

    if (
      /^https?:\/\//i.test(
        url,
      ) ||
      url.startsWith(
        "data:",
      ) ||
      url.startsWith(
        "blob:",
      )
    ) {
      return url;
    }

    const base =
      String(
        config.public
          .strapiUrl ??
          "http://localhost:1337",
      ).replace(/\/+$/, "");

    return `${base}/${
      url.replace(
        /^\/+/,
        "",
      )
    }`;
  }

  function normalizeMember(
    member:
      LibraryVisitMember,
  ): LibraryVisitMember {
    return {
      ...member,
      photoUrl:
        resolveMediaUrl(
          member.photoUrl,
        ),
    };
  }

  function normalizeVisit(
    record:
      LibraryVisitRecord,
  ): LibraryVisitRecord {
    return {
      ...record,
      member:
        record.member
          ? normalizeMember(
              record.member,
            )
          : undefined,
    };
  }

  async function timeIn(
    barcode: string,
  ) {
    const response =
      await auth.authFetch<
        DataResponse<LibraryVisitRecord>
      >(
        "/api/library-visits/time-in",
        {
          method: "POST",
          body: {
            data: {
              barcode:
                barcode.trim(),
            },
          },
        },
      );

    return normalizeVisit(
      response.data,
    );
  }

  async function list(
    input: {
      from?: string;
      to?: string;
      memberType?:
        | LibraryVisitMemberType
        | "all";
      search?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<LibraryVisitListResponse> {
    const response =
      await auth.authFetch<
        LibraryVisitListResponse
      >(
        "/api/library-visits/managed",
        {
          method: "GET",
          query: {
            from:
              input.from ||
              undefined,
            to:
              input.to ||
              undefined,
            memberType:
              input.memberType &&
              input.memberType !==
                "all"
                ? input.memberType
                : undefined,
            search:
              input.search
                ?.trim() ||
              undefined,
            page:
              Math.max(
                Number(
                  input.page,
                ) || 1,
                1,
              ),
            pageSize:
              Math.min(
                Math.max(
                  Number(
                    input.pageSize,
                  ) || 10,
                  1,
                ),
                50,
              ),
          },
        },
      );

    return {
      ...response,
      data:
        response.data.map(
          normalizeVisit,
        ),
    };
  }

  async function summary(
    input: {
      from?: string;
      to?: string;
    } = {},
  ) {
    const response =
      await auth.authFetch<
        DataResponse<LibraryVisitSummary>
      >(
        "/api/library-visits/summary",
        {
          method: "GET",
          query: {
            from:
              input.from ||
              undefined,
            to:
              input.to ||
              undefined,
          },
        },
      );

    return response.data;
  }

  async function findByBarcode(
    barcode: string,
  ) {
    const response =
      await auth.authFetch<
        DataResponse<LibraryVisitMember>
      >(
        `/api/library-visits/members/${encodePath(
          barcode,
        )}`,
        {
          method: "GET",
        },
      );

    return normalizeMember(
      response.data,
    );
  }

  return {
    timeIn,
    list,
    summary,
    findByBarcode,
  };
}
