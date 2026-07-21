export type StudentStatus =
  | "Active"
  | "Inactive"
  | "Suspended"
  | "Graduated"
  | "Dropped";

export type FacultyStatus =
  | "Active"
  | "Inactive"
  | "Retired";

export type MembershipStatus =
  | "Active"
  | "Expired"
  | "Suspended"
  | "Cancelled"
  | null;

export interface MembershipRecord {
  documentId: string;
  membershipNo: string;
  academicYear: string;
  semester: "First Semester" | "Second Semester" | "Summer";
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
  course: string;
  yearLevel?: number | null;
  section: string;
  email: string;
  contactNo: string;
  photoUrl?: string | null;
  status: StudentStatus;
  membership: MembershipRecord | null;
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
  department: string;
  designation: string;
  email: string;
  contactNo: string;
  photoUrl?: string | null;
  status: FacultyStatus;
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

export interface StudentRegistrationInput {
  student: {
    studentNo: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    sex?: string;
    course: string;
    yearLevel?: number;
    section?: string;
    email?: string;
    contactNo?: string;
  };
  membership: {
    academicYear: string;
    semester: string;
    issuedDate: string;
    expiryDate: string;
    enrollmentVerified: boolean;
    enrollmentReference?: string;
    remarks?: string;
  };
}

export interface FacultyRegistrationInput {
  employeeNo: string;
  barcode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  department: string;
  designation?: string;
  email?: string;
  contactNo?: string;
}

export function useLibraryMembers() {
  const auth = useAuth();

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

  return {
    listStudents(input: Record<string, unknown>) {
      return auth.authFetch<StudentListResponse>(
        "/api/library-members/students",
        { method: "GET", query: query(input) },
      );
    },

    registerStudent(input: StudentRegistrationInput) {
      return auth.authFetch<{
        data: {
          student: StudentMember;
          membership: MembershipRecord;
        };
      }>("/api/library-members/students", {
        method: "POST",
        body: { data: input },
      });
    },

    updateStudent(documentId: string, input: Record<string, unknown>) {
      return auth.authFetch<{ data: StudentMember }>(
        `/api/library-members/students/${documentId}`,
        { method: "PUT", body: { data: input } },
      );
    },

    listFaculty(input: Record<string, unknown>) {
      return auth.authFetch<FacultyListResponse>(
        "/api/library-members/faculty",
        { method: "GET", query: query(input) },
      );
    },

    registerFaculty(input: FacultyRegistrationInput) {
      return auth.authFetch<{ data: FacultyMember }>(
        "/api/library-members/faculty",
        { method: "POST", body: { data: input } },
      );
    },

    updateFaculty(documentId: string, input: Record<string, unknown>) {
      return auth.authFetch<{ data: FacultyMember }>(
        `/api/library-members/faculty/${documentId}`,
        { method: "PUT", body: { data: input } },
      );
    },

    listMemberships(input: Record<string, unknown>) {
      return auth.authFetch<MembershipListResponse>(
        "/api/library-memberships/managed",
        { method: "GET", query: query(input) },
      );
    },

    lookupStudentCard(barcode: string) {
      return auth.authFetch<{
        data: {
          student: StudentMember;
          canRenew: boolean;
          reason: string | null;
        };
      }>(
        `/api/library-memberships/lookup/${encodeURIComponent(barcode.trim())}`,
        { method: "GET" },
      );
    },

    renewMembership(input: {
      barcode: string;
      academicYear: string;
      semester: string;
      issuedDate: string;
      expiryDate: string;
      enrollmentVerified: boolean;
      enrollmentReference?: string;
      remarks?: string;
    }) {
      return auth.authFetch<{
        data: {
          student: StudentMember;
          membership: MembershipRecord;
        };
      }>("/api/library-memberships/renew", {
        method: "POST",
        body: { data: input },
      });
    },
  };
}
