export interface AdminOperationsData {
  generatedAt: string;
  timezone: string;
  collection: {
    titles: number;
    copies: number;
    available: number;
    borrowed: number;
    reserved: number;
    damaged: number;
    lost: number;
    archived: number;
  };
  circulation: {
    activeBorrowings: number;
    overdue: number;
    checkoutsToday: number;
    returnsToday: number;
  };
  reservations: {
    pending: number;
    approved: number;
    readyForPickup: number;
    expired: number;
  };
  membership: {
    activeMemberships: number;
    pendingMemberships: number;
    expiredMemberships: number;
    suspendedMemberships: number;
    activeStudents: number;
    activeFaculty: number;
    pendingRegistrations: number;
  };
  fines: {
    unpaid: number;
    paid: number;
    waived: number;
    outstandingAmount: number;
    recordedPaidAmount: number;
  };
  attendance: {
    today: number;
    studentsToday: number;
    facultyToday: number;
  };
  facultyAccountability: {
    needsAttention: number;
    lostWillReplace: number;
    replacementSubmitted: number;
    readyForReturn: number;
    unresolvedReports: number;
  };
  attention: Record<string, number>;
  recentOperations: Array<{
    type: string;
    label: string;
    description: string;
    occurredAt: string;
    status: string | null;
  }>;
}

function emptyData(): AdminOperationsData {
  return {
    generatedAt: "",
    timezone: "Asia/Manila",
    collection: {
      titles: 0,
      copies: 0,
      available: 0,
      borrowed: 0,
      reserved: 0,
      damaged: 0,
      lost: 0,
      archived: 0,
    },
    circulation: {
      activeBorrowings: 0,
      overdue: 0,
      checkoutsToday: 0,
      returnsToday: 0,
    },
    reservations: {
      pending: 0,
      approved: 0,
      readyForPickup: 0,
      expired: 0,
    },
    membership: {
      activeMemberships: 0,
      pendingMemberships: 0,
      expiredMemberships: 0,
      suspendedMemberships: 0,
      activeStudents: 0,
      activeFaculty: 0,
      pendingRegistrations: 0,
    },
    fines: {
      unpaid: 0,
      paid: 0,
      waived: 0,
      outstandingAmount: 0,
      recordedPaidAmount: 0,
    },
    attendance: {
      today: 0,
      studentsToday: 0,
      facultyToday: 0,
    },
    facultyAccountability: {
      needsAttention: 0,
      lostWillReplace: 0,
      replacementSubmitted: 0,
      readyForReturn: 0,
      unresolvedReports: 0,
    },
    attention: {},
    recentOperations: [],
  };
}

export function useAdminOperations() {
  const auth = useAuth();
  const data = useState<AdminOperationsData>(
    "admin-operations-summary",
    emptyData,
  );
  const loading = useState("admin-operations-loading", () => false);
  const error = useState("admin-operations-error", () => "");

  async function refresh() {
    if (loading.value) return;
    loading.value = true;
    error.value = "";

    try {
      const response = await auth.authFetch<{ data: AdminOperationsData }>(
        "/api/admin-operations/summary",
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
    loading,
    error,
    refresh,
  };
}
