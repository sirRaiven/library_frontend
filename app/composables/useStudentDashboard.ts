export interface StudentDashboardProfile {
  documentId: string;
  studentNo: string;
  libraryCardNo: string | null;
  barcode: string;
  fullName: string;
  firstName: string;
  educationalLevel: string;
  course: string;
  yearLevel: number | null;
  section: string | null;
  email: string | null;
  contactNo: string | null;
  studentStatus: string;
  libraryCardStatus: string;
  photoUrl: string | null;
}

export interface StudentMembershipSummary {
  documentId: string | null;
  membershipNo: string | null;
  academicYear: string | null;
  semester: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  status: string;
  enrollmentVerified: boolean;
  daysRemaining: number | null;
  isActive: boolean;
}

export interface StudentCurrentLoan {
  documentId: string;
  borrowNo: string;
  borrowDate: string;
  dueDate: string;
  status: string;
  daysRemaining: number | null;
  isOverdue: boolean;
  book: {
    documentId: string | null;
    title: string;
    author: string;
    isbn: string | null;
  };
  copy: {
    documentId: string | null;
    controlNumber: string | null;
    accessionNumber: string | null;
    shelfLocation: string | null;
  };
}

export interface StudentActiveReservation {
  documentId: string;
  reservationNo: string | null;
  reservationDate: string | null;
  expirationDate: string | null;
  status: string;
  book: {
    documentId: string | null;
    title: string;
    author: string;
  };
}

export interface StudentPortalNotice {
  code: string;
  title: string;
  message: string;
  severity: "Info" | "Success" | "Warning" | "Critical";
  actionUrl?: string;
}

export interface StudentDashboardData {
  generatedAt: string;
  student: StudentDashboardProfile | null;
  membership: StudentMembershipSummary;
  metrics: {
    currentLoans: number;
    overdueLoans: number;
    dueSoonLoans: number;
    activeReservations: number;
    attentionItems: number;
  };
  currentLoans: StudentCurrentLoan[];
  activeReservations: StudentActiveReservation[];
  notices: StudentPortalNotice[];
}

function emptyData(): StudentDashboardData {
  return {
    generatedAt: "",
    student: null,
    membership: {
      documentId: null,
      membershipNo: null,
      academicYear: null,
      semester: null,
      issuedDate: null,
      expiryDate: null,
      status: "Checking",
      enrollmentVerified: false,
      daysRemaining: null,
      isActive: false,
    },
    metrics: {
      currentLoans: 0,
      overdueLoans: 0,
      dueSoonLoans: 0,
      activeReservations: 0,
      attentionItems: 0,
    },
    currentLoans: [],
    activeReservations: [],
    notices: [],
  };
}

export function useStudentDashboard() {
  const auth = useAuth();
  const monitoring = useStudentSession();
  const data = useState<StudentDashboardData>(
    "student-dashboard-data",
    emptyData,
  );
  const loading = useState<boolean>("student-dashboard-loading", () => false);
  const error = useState<string>("student-dashboard-error", () => "");

  async function refresh() {
    if (loading.value) return;

    loading.value = true;
    error.value = "";

    try {
      await monitoring.start();

      const headers = new Headers();
      if (monitoring.sessionKey.value) {
        headers.set("X-Student-Session", monitoring.sessionKey.value);
      }

      const response = await auth.authFetch<{ data: StudentDashboardData }>(
        "/api/student-portal/dashboard",
        { headers },
      );

      data.value = response.data;
    } catch (caught) {
      error.value = auth.getErrorMessage(caught);
      throw caught;
    } finally {
      loading.value = false;
    }
  }

  return {
    data,
    student: computed(() => data.value.student),
    membership: computed(() => data.value.membership),
    metrics: computed(() => data.value.metrics),
    currentLoans: computed(() => data.value.currentLoans),
    activeReservations: computed(() => data.value.activeReservations),
    notices: computed(() => data.value.notices),
    loading,
    error,
    refresh,
  };
}
