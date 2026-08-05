export type LibraryFineStatus = "Unpaid" | "Paid" | "Waived" | "Cancelled";
export type LibraryFineType =
  | "Overdue Book"
  | "Damaged Book"
  | "Lost Book"
  | "Library Card Replacement"
  | "Other";

export interface LibraryFineRecord {
  documentId: string;
  fineNo: string;
  type: LibraryFineType;
  description: string;
  referenceNo: string;
  bookTitle: string;
  amount: number;
  ratePerDay: number;
  chargeableDays: number;
  calendarDaysOverdue: number;
  status: LibraryFineStatus;
  assessedAt: string;
  assessedBy?: string | null;
  orNumber?: string | null;
  paymentDate?: string | null;
  paymentNotes?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  waiverReason?: string | null;
  member: {
    type: "Student" | "Faculty" | "Unknown";
    documentId?: string | null;
    identifier: string;
    fullName: string;
    libraryCardNo?: string | null;
  };
}

export interface FineCalendarEntry {
  documentId: string;
  exceptionNo: string;
  title: string;
  type:
    | "Regular Holiday"
    | "Special Non-Working Day"
    | "Special Working Day"
    | "School Event"
    | "Class Suspension"
    | "Natural Disaster"
    | "Emergency Closure"
    | "Other";
  startDate: string;
  endDate: string;
  resumeDate: string;
  reason: string;
  status: "Active" | "Cancelled" | "Removed";
  automatic: boolean;
  affectsFines: boolean;
  sourceName?: string | null;
  sourceReference?: string | null;
  externalKey?: string | null;
  holidayYear?: number | null;
  syncedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface FineCalendarInput {
  title: string;
  type: Exclude<
    FineCalendarEntry["type"],
    "Regular Holiday" | "Special Non-Working Day" | "Special Working Day"
  >;
  startDate: string;
  endDate: string;
  resumeDate?: string;
  reason?: string;
}

export function useLibraryFines() {
  const auth = useAuth();

  async function list(input: {
    search?: string;
    status?: string;
    type?: string;
    studentDocumentId?: string;
    page?: number;
    pageSize?: number;
  } = {}) {
    return await auth.authFetch<{
      data: LibraryFineRecord[];
      meta: {
        pagination: { page: number; pageSize: number; pageCount: number; total: number };
        summary: { unpaid: number; paid: number; cardReplacements: number; outstandingAmount: number };
      };
    }>("/api/library-fines", {
      query: { ...input, _refresh: Date.now() },
      cache: "no-store",
    });
  }

  async function createCardReplacement(studentDocumentId: string, reason: string) {
    return await auth.authFetch<{ data: LibraryFineRecord }>(
      "/api/library-fines/card-replacement",
      {
        method: "POST",
        body: { data: { studentDocumentId, reason } },
      },
    );
  }

  async function verifyPayment(documentId: string, input: { orNumber: string; paymentDate: string; notes?: string }) {
    return await auth.authFetch<{ data: LibraryFineRecord }>(
      `/api/library-fines/${encodeURIComponent(documentId)}/verify-payment`,
      { method: "POST", body: { data: input } },
    );
  }

  async function waive(documentId: string, reason: string) {
    return await auth.authFetch<{ data: LibraryFineRecord }>(
      `/api/library-fines/${encodeURIComponent(documentId)}/waive`,
      { method: "POST", body: { data: { reason } } },
    );
  }

  async function listCalendar(input: { status?: string; search?: string; year?: number | string } = {}) {
    const response = await auth.authFetch<{ data: FineCalendarEntry[] }>(
      "/api/library-fines/calendar",
      { query: { ...input, _refresh: Date.now() }, cache: "no-store" },
    );
    return response.data;
  }

  async function syncPhilippineHolidays(years: number[]) {
    return await auth.authFetch<{
      data: {
        provider: string;
        automatic: boolean;
        results: Array<{
          year: number;
          skipped?: boolean;
          created?: number;
          updated?: number;
          total?: number;
          syncSucceeded?: boolean;
          cachedOnly?: boolean;
          cachedCount?: number;
          provider?: string | null;
          attemptedProviders?: string[];
          removed?: number;
          repairedIncompleteCalendar?: boolean;
          calendarComplete?: boolean | null;
          expectedTotal?: number;
          existingTotal?: number;
          classificationCounts?: {
            regularHolidays: number;
            specialNonWorkingDays: number;
            specialWorkingDays: number;
          };
          warning?: string;
          syncedAt?: string;
          latestSync?: string;
        }>;
      };
    }>("/api/library-fines/calendar/sync-holidays", {
      method: "POST",
      body: { data: { years, force: true } },
    });
  }

  async function createCalendar(input: FineCalendarInput) {
    return await auth.authFetch<{ data: FineCalendarEntry }>(
      "/api/library-fines/calendar",
      { method: "POST", body: { data: input } },
    );
  }

  async function updateCalendar(documentId: string, input: Partial<FineCalendarInput>) {
    return await auth.authFetch<{ data: FineCalendarEntry }>(
      `/api/library-fines/calendar/${encodeURIComponent(documentId)}`,
      { method: "PATCH", body: { data: input } },
    );
  }

  async function cancelCalendar(documentId: string, reason: string) {
    return await auth.authFetch<{ data: FineCalendarEntry }>(
      `/api/library-fines/calendar/${encodeURIComponent(documentId)}/cancel`,
      { method: "POST", body: { data: { reason } } },
    );
  }

  async function removeCalendar(documentId: string, reason: string) {
    return await auth.authFetch<{ data: FineCalendarEntry }>(
      `/api/library-fines/calendar/${encodeURIComponent(documentId)}/remove`,
      { method: "POST", body: { data: { reason } } },
    );
  }

  async function restoreCalendar(documentId: string) {
    return await auth.authFetch<{ data: FineCalendarEntry }>(
      `/api/library-fines/calendar/${encodeURIComponent(documentId)}/restore`,
      { method: "POST" },
    );
  }

  return {
    list,
    createCardReplacement,
    verifyPayment,
    waive,
    listCalendar,
    syncPhilippineHolidays,
    createCalendar,
    updateCalendar,
    cancelCalendar,
    removeCalendar,
    restoreCalendar,
  };
}
