import type { LibraryCardStatus } from "~/constants/studentPrograms";

export type StudentStatus =
  | "Active"
  | "Inactive"
  | "Pending Approval"
  | "Suspended"
  | "Graduated"
  | "Dropped";

export type FacultyStatus =
  | "Active"
  | "Inactive"
  | "Retired";

export type MembershipStatus =
  | "Active"
  | "Pending Approval"
  | "Expired"
  | "Suspended"
  | "Cancelled"
  | null;

export interface MembershipRecord {
  documentId: string;
  membershipNo: string;
  academicYear: string;
  semester: string;
  issuedDate: string;
  expiryDate: string;
  status: MembershipStatus;
  storedStatus: Exclude<MembershipStatus, null>;
  renewalType: "Initial" | "Renewal";
  enrollmentVerified: boolean;
  enrollmentReference?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  remarks?: string | null;
}


export interface StudentEducationReference {
  level: { code: string; name: string; active?: boolean } | null;
  program: { code: string; name: string; shortName?: string | null; active?: boolean } | null;
  yearLevel: { code: string; label: string; value: number; active?: boolean } | null;
}

export interface StudentMember {
  documentId: string;
  studentNo: string;
  libraryCardNo: string;
  barcode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  fullName: string;
  sex?: "Male" | "Female" | null;
  educationalLevel: string;
  course: string;
  yearLevel?: number | null;
  education?: StudentEducationReference | null;
  section: string;
  email: string;
  contactNo: string;
  address: string;
  photoUrl?: string | null;
  libraryCardStatus:
    LibraryCardStatus;
  libraryCardReleaseDate?:
    string | null;
  status: StudentStatus;
  membership: MembershipRecord | null;
}

export type FacultySex =
  | "Male"
  | "Female"
  | "Prefer not to say";

export type FacultyEmploymentType = string;

export interface FacultyReferenceValue {
  code: string;
  name: string;
  active?: boolean;
}

export interface FacultyMember {
  documentId: string;
  employeeNo: string;
  barcode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  fullName: string;
  sex?: FacultySex | null;
  department: string;
  departmentReference?: FacultyReferenceValue | null;
  designation: string;
  employmentType: FacultyEmploymentType;
  employmentTypeReference?: FacultyReferenceValue | null;
  email: string;
  contactNo: string;
  address: string;
  photoUrl?: string | null;
  status: FacultyStatus;
  activeLoanCount: number;
  canBorrow: boolean;
  registeredAt?: string | null;
  registeredBy?: string | null;
  lastUpdatedAt?: string | null;
  updatedBy?: string | null;
}

export interface FacultyCredentialConflict {
  documentId: string;
  employeeNo: string;
  barcode: string;
  fullName: string;
  status: FacultyStatus;
}

export interface FacultyCredentialCheck {
  employeeNo: {
    value: string;
    available: boolean;
    conflict:
      FacultyCredentialConflict |
      null;
  };
  barcode: {
    value: string;
    available: boolean;
    conflict:
      FacultyCredentialConflict |
      null;
  };
  canProceed: boolean;
}

interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface StudentListResponse {
  data: StudentMember[];
  meta: {
    pagination: Pagination;
    summary: {
      totalStudents: number;
      activeMemberships: number;
      expiredMemberships: number;
      suspendedMemberships: number;
    };
  };
}

export interface FacultyListResponse {
  data: FacultyMember[];
  meta: {
    pagination: Pagination;
    summary: {
      totalFaculty: number;
      activeFaculty: number;
      inactiveFaculty: number;
      retiredFaculty: number;
      activeLoans: number;
      facultyWithActiveLoans: number;
    };
  };
}

export interface MembershipListItem extends MembershipRecord {
  student: StudentMember;
}

export interface MembershipListResponse {
  data: MembershipListItem[];
  meta: {
    pagination: Pagination;
    summary: {
      totalMemberships: number;
      active: number;
      expired: number;
      suspended: number;
    };
  };
}

export type StudentPortalPasswordMode =
  | "Generated"
  | "Manual";

export interface StudentPortalCredentials {
  created: true;
  username: string;
  email: string;
  temporaryPassword: string;
  passwordMode?: StudentPortalPasswordMode;
}

export interface StudentRegistrationInput {
  student: {
    studentNo: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    sex?: string;
    educationalLevelCode: string;
    programCode: string;
    yearLevelCode: string;
    section?: string;
    email?: string;
    contactNo?: string;
    address?: string;
    libraryCardStatus?:
      LibraryCardStatus;
    libraryCardReleaseDate?:
      string;
    photoId?: number;
  };
  membership: {
    academicTermCode?: string;
    academicYear: string;
    semester: string;
    issuedDate: string;
    expiryDate: string;
    enrollmentVerified: boolean;
    enrollmentReference?: string;
    remarks?: string;
  };
  portalAccount: {
    create: boolean;
    username?: string;
    passwordMode?: StudentPortalPasswordMode;
    temporaryPassword?: string;
  };
}


export interface UploadedStudentPhoto {
  id: number;
  documentId?: string;
  name: string;
  url: string;
  mime?: string;
  size?: number;
}

export interface FacultyRegistrationInput {
  employeeNo: string;
  barcode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  sex?: FacultySex;
  departmentCode: string;
  designation?: string;
  employmentTypeCode: string;
  email?: string;
  contactNo?: string;
  address?: string;
}

export interface FacultyUpdateInput
  extends Omit<FacultyRegistrationInput, "departmentCode" | "employmentTypeCode"> {
  departmentCode?: string;
  employmentTypeCode?: string;
  status: FacultyStatus;
}

export interface FacultyMutationMeta {
  activeLoanCount: number;
  warning: string | null;
}

export function useLibraryMembers() {
  const auth = useAuth();
  const runtimeConfig = useRuntimeConfig();

  function strapiBaseUrl(): string {
    return String(
      runtimeConfig.public.strapiUrl ??
        "",
    )
      .replace(/\/api\/?$/, "")
      .replace(/\/$/, "");
  }

  function resolveMediaUrl(
    value?: string | null,
  ): string | null {
    const source = value?.trim() ?? "";

    if (!source) {
      return null;
    }

    if (
      source.startsWith("http://") ||
      source.startsWith("https://") ||
      source.startsWith("blob:") ||
      source.startsWith("data:")
    ) {
      return source;
    }

    const normalizedPath =
      source.startsWith("/")
        ? source
        : `/${source}`;

    return `${strapiBaseUrl()}${normalizedPath}`;
  }

  function normalizeStudent(
    student: StudentMember,
  ): StudentMember {
    return {
      ...student,
      photoUrl: resolveMediaUrl(
        student.photoUrl,
      ),
    };
  }

  function normalizeFaculty(
    faculty: FacultyMember,
  ): FacultyMember {
    return {
      ...faculty,
      photoUrl: resolveMediaUrl(
        faculty.photoUrl,
      ),
    };
  }

  function normalizeMembershipItem(
    membership: MembershipListItem,
  ): MembershipListItem {
    return {
      ...membership,
      student: normalizeStudent(
        membership.student,
      ),
    };
  }

  function query(input: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        value !== "All",
      ),
    );
  }

  async function listAllStudents(
    input: Record<string, unknown> = {},
  ): Promise<StudentMember[]> {
    const records = new Map<
      string,
      StudentMember
    >();

    const pageSize = 100;
    let currentPage = 1;
    let pageCount = 1;

    do {
      const response =
        await auth.authFetch<
          StudentListResponse
        >(
          "/api/library-members/students",
          {
            method: "GET",
            query: query({
              ...input,
              page: currentPage,
              pageSize,
            }),
          },
        );

      for (const rawStudent of response.data) {
        const student =
          normalizeStudent(rawStudent);

        const key =
          student.documentId ||
          student.libraryCardNo ||
          student.studentNo;

        if (key) {
          records.set(key, student);
        }
      }

      pageCount = Math.max(
        response.meta.pagination.pageCount || 1,
        1,
      );

      currentPage += 1;

      if (currentPage > 200) {
        throw new Error(
          "The Student directory is too large to prepare in one print job. Apply filters or print selected Students instead.",
        );
      }
    } while (currentPage <= pageCount);

    return [...records.values()];
  }

  return {
    resolveMediaUrl,
    listAllStudents,

    async uploadStudentPhoto(
      file: File,
      studentNo?: string,
    ) {
      const safeStudentNo =
        studentNo
          ?.trim()
          .replace(
            /[^a-zA-Z0-9_-]+/g,
            "-",
          ) ||
        "student";

      const extension =
        file.type === "image/png"
          ? "png"
          : "jpg";

      const uploadFile =
        new File(
          [file],
          `${safeStudentNo}-library-card-${Date.now()}.${extension}`,
          {
            type: file.type,
            lastModified:
              file.lastModified,
          },
        );

      const formData =
        new FormData();

      formData.append(
        "files",
        uploadFile,
      );

      const response =
        await auth.authFetch<
          UploadedStudentPhoto[]
        >("/api/upload", {
          method: "POST",
          body: formData,
        });

      const uploaded =
        response?.[0];

      if (
        !uploaded?.id ||
        !uploaded.url
      ) {
        throw new Error(
          "The Student photo upload did not return a usable media record.",
        );
      }

      return {
        ...uploaded,
        url:
          resolveMediaUrl(
            uploaded.url,
          ) ?? uploaded.url,
      };
    },

    async listStudents(
      input: Record<string, unknown>,
    ) {
      const response =
        await auth.authFetch<
          StudentListResponse
        >(
          "/api/library-members/students",
          {
            method: "GET",
            query: query(input),
          },
        );

      return {
        ...response,
        data: response.data.map(
          normalizeStudent,
        ),
      };
    },

    async registerStudent(
      input: StudentRegistrationInput,
    ) {
      const response =
        await auth.authFetch<{
          data: {
            student: StudentMember;
            membership: MembershipRecord;
            portalAccount: StudentPortalCredentials | null;
          };
        }>(
          "/api/library-members/students",
          {
            method: "POST",
            body: {
              data: input,
            },
          },
        );

      return {
        ...response,
        data: {
          ...response.data,
          student: normalizeStudent(
            response.data.student,
          ),
        },
      };
    },

    async updateStudent(
      documentId: string,
      input: Record<string, unknown>,
    ) {
      const response =
        await auth.authFetch<{
          data: StudentMember;
        }>(
          `/api/library-members/students/${documentId}`,
          {
            method: "PUT",
            body: {
              data: input,
            },
          },
        );

      return {
        ...response,
        data: normalizeStudent(
          response.data,
        ),
      };
    },

    async listFaculty(
      input: Record<string, unknown>,
    ) {
      const response =
        await auth.authFetch<
          FacultyListResponse
        >(
          "/api/library-members/faculty",
          {
            method: "GET",
            query: query(input),
          },
        );

      return {
        ...response,
        data: response.data.map(
          normalizeFaculty,
        ),
      };
    },

    async checkFacultyCredential(
      input: {
        employeeNo: string;
        barcode: string;
        excludeDocumentId?: string;
      },
    ) {
      const response =
        await auth.authFetch<{
          data:
            FacultyCredentialCheck;
        }>(
          "/api/library-members/faculty/check-credential",
          {
            method: "GET",
            query: query(input),
          },
        );

      return response.data;
    },

    async registerFaculty(
      input: FacultyRegistrationInput,
    ) {
      const response =
        await auth.authFetch<{
          data: FacultyMember;
          meta:
            FacultyMutationMeta;
        }>(
          "/api/library-members/faculty",
          {
            method: "POST",
            body: {
              data: input,
            },
          },
        );

      return {
        ...response,
        data: normalizeFaculty(
          response.data,
        ),
      };
    },

    async updateFaculty(
      documentId: string,
      input: FacultyUpdateInput,
    ) {
      const response =
        await auth.authFetch<{
          data: FacultyMember;
          meta:
            FacultyMutationMeta;
        }>(
          `/api/library-members/faculty/${documentId}`,
          {
            method: "PUT",
            body: {
              data: input,
            },
          },
        );

      return {
        ...response,
        data: normalizeFaculty(
          response.data,
        ),
      };
    },

    async listMemberships(
      input: Record<string, unknown>,
    ) {
      const response =
        await auth.authFetch<
          MembershipListResponse
        >(
          "/api/library-memberships/managed",
          {
            method: "GET",
            query: query(input),
          },
        );

      return {
        ...response,
        data: response.data.map(
          normalizeMembershipItem,
        ),
      };
    },

    async lookupStudentCard(
      barcode: string,
    ) {
      const response =
        await auth.authFetch<{
          data: {
            student: StudentMember;
            canRenew: boolean;
            reason: string | null;
          };
        }>(
          `/api/library-memberships/lookup/${encodeURIComponent(barcode.trim())}`,
          {
            method: "GET",
          },
        );

      return {
        ...response,
        data: {
          ...response.data,
          student: normalizeStudent(
            response.data.student,
          ),
        },
      };
    },

    async renewMembership(input: {
      barcode: string;
      academicYear: string;
      semester: string;
      academicTermCode?: string;
      issuedDate: string;
      expiryDate: string;
      enrollmentVerified: boolean;
      enrollmentReference?: string;
      remarks?: string;
    }) {
      const response =
        await auth.authFetch<{
          data: {
            student: StudentMember;
            membership: MembershipRecord;
          };
        }>(
          "/api/library-memberships/renew",
          {
            method: "POST",
            body: {
              data: input,
            },
          },
        );

      return {
        ...response,
        data: {
          ...response.data,
          student: normalizeStudent(
            response.data.student,
          ),
        },
      };
    },
  };
}
