export type MemberType =
  | "Student"
  | "Faculty";

export interface CirculationMember {
  documentId: string;
  type: MemberType;
  barcode?: string;
  identifier: string;
  fullName: string;
  status: string;
  membershipStatus?: string | null;
  membershipExpiry?: string | null;
  programOrDepartment?: string;
  borrowLimit: number;
  loanDays?: number;
  suggestedDueDate?: string;
  activeBorrowCount: number;
  overdueBorrowCount?: number;
  unpaidFineCount?: number;
  remainingSlots: number;
  canBorrow: boolean;
  enrollmentVerified?: boolean;
  restrictionReason?: string | null;
  restrictionReasons?: string[];
}

export interface CirculationBookCopy {
  documentId: string;
  accessionNumber: string;
  controlNumber: string;
  shelfLocation?: string;
  status: string;
  condition: string;
  available: boolean;
  book: {
    documentId?: string;
    title: string;
    author: string;
    category?: string;
  };
}

export interface BorrowResult {
  checkoutReference: string;
  member: CirculationMember;
  transactions: Array<{
    documentId: string;
    borrowNo: string;
    controlNumber: string;
    accessionNumber: string;
    title: string;
    author: string;
    dueDate: string;
    fulfilledReservationDocumentId?: string | null;
    fulfilledReservationNo?: string | null;
  }>;
}

export interface RecentBorrow {
  documentId: string;
  borrowNo: string;
  checkoutReference: string;
  borrowDate: string;
  dueDate: string;
  status: string;
  memberType: MemberType;
  memberName: string;
  memberIdentifier: string;
  controlNumber: string;
  accessionNumber: string;
  title: string;
}

export interface ReturnLookup {
  borrowDocumentId: string;
  borrowNo: string;
  checkoutReference: string;
  borrowDate: string;
  dueDate: string;
  status: string;
  daysOverdue: number;
  fine: {
    calendarDaysOverdue: number;
    chargeableSchoolDays: number;
    excludedWeekendDays: number;
    excludedExceptionDays: number;
    dailyRate: number;
    overdueAmount: number;
    conditionFee: number;
    estimatedTotal: number;
    exceptionDates: Array<{ date: string; title: string; type: string }>;
  };
  member: {
    documentId?: string | null;
    type: MemberType;
    fullName: string;
    identifier: string;
  };
  copy: {
    documentId: string;
    accessionNumber: string;
    controlNumber: string;
    currentStatus: string;
    shelfLocation?: string;
    book: {
      title: string;
      author: string;
      category?: string;
    };
  };
}


export interface ReturnMemberSummary {
  documentId: string;
  type: MemberType;
  barcode?: string;
  identifier: string;
  fullName: string;
  status: string;
  programOrDepartment?: string;
}

export interface MemberReturnLookup {
  member: ReturnMemberSummary;
  activeBorrows: ReturnLookup[];
  totalActive: number;
  overdueCount: number;
}

export interface BatchReturnInputItem {
  borrowDocumentId: string;

  /**
   * Physical barcode scanned at the Return counter.
   * The backend verifies that it belongs to the selected Borrow Transaction.
   */
  scannedBarcode: string;

  condition: "Good" | "Damaged" | "Lost";
  fineAmount?: number;
  remarks?: string;
}

export interface BatchReturnFailure {
  borrowDocumentId: string;
  borrowNo?: string;
  title?: string;
  message: string;
}

export interface BatchReturnResult {
  processedCount: number;
  failedCount: number;
  results: ProcessReturnResult[];
  failures: BatchReturnFailure[];
}

export interface ProcessReturnResult {
  returnNo: string;
  returnDocumentId: string;
  returnDate: string;
  condition: "Good" | "Damaged" | "Lost";
  fineAmount: number;
  fineBreakdown?: {
    calendarDaysOverdue: number;
    chargeableSchoolDays: number;
    dailyRate: number;
    overdueAmount: number;
    conditionFee: number;
    totalAmount: number;
  };
  borrow: ReturnLookup;
  copyStatus: string;
}

export interface TodayReturn {
  documentId: string;
  returnNo: string;
  returnDate: string;
  condition: string;
  fineAmount: number;
  borrowNo: string;
  dueDate: string;
  memberType: MemberType;
  memberName: string;
  memberIdentifier: string;
  controlNumber: string;
  accessionNumber: string;
  title: string;
}

export type ReservationStatus =
  | "Pending"
  | "Approved"
  | "Ready for Pickup"
  | "Completed"
  | "Cancelled"
  | "Expired";

export interface ReservationBook {
  documentId: string;
  title: string;
  author: string;
  isbn?: string;
  category?: string;
  totalCopies: number;
  availableCopies: number;
}

export interface ManagedReservation {
  documentId: string;
  reservationNo: string;
  reservationDate: string;
  expirationDate: string;
  status: ReservationStatus;
  remarks?: string;
  member: {
    type: MemberType;
    fullName: string;
    identifier: string;
  };
  book: {
    documentId?: string;
    title: string;
    author: string;
    category?: string;
  };
  checkout?: {
    required: boolean;
    completed: boolean;
    legacyMissingBorrow?: boolean;
    borrowTransaction?: {
      documentId: string;
      borrowNo: string;
      checkoutReference: string;
      borrowDate: string;
      dueDate: string;
      status: string;
    } | null;
  };
}

export interface ReservationListResponse {
  data: ManagedReservation[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
    summary?: {
      totalCount: number;
      activeCount: number;
      pendingCount: number;
      readyCount: number;
      expiringCount: number;
    };
  };
}

interface DataResponse<T> {
  data: T;
}

function encodePath(value: string): string {
  return encodeURIComponent(value.trim());
}

export function useLibraryCirculation() {
  const auth = useAuth();

  async function lookupMember(
    barcode: string,
  ): Promise<CirculationMember> {
    const response =
      await auth.authFetch<
        DataResponse<CirculationMember>
      >(
        `/api/circulation/members/${encodePath(
          barcode,
        )}`,
        {
          method: "GET",
        },
      );

    return response.data;
  }

  async function lookupCopy(
    barcode: string,
  ): Promise<CirculationBookCopy> {
    const response =
      await auth.authFetch<
        DataResponse<CirculationBookCopy>
      >(
        `/api/circulation/copies/${encodePath(
          barcode,
        )}`,
        {
          method: "GET",
        },
      );

    return response.data;
  }

  async function borrowBooks(input: {
    memberType: MemberType;
    memberDocumentId: string;
    copyDocumentIds: string[];
    dueDate: string;
    remarks?: string;
  }): Promise<BorrowResult> {
    const response =
      await auth.authFetch<
        DataResponse<BorrowResult>
      >("/api/circulation/borrow", {
        method: "POST",
        body: {
          data: input,
        },
      });

    return response.data;
  }

  async function recentBorrows(
    limit = 8,
  ): Promise<RecentBorrow[]> {
    const response =
      await auth.authFetch<
        DataResponse<RecentBorrow[]>
      >(
        "/api/circulation/borrows/recent",
        {
          method: "GET",
          query: {
            limit,
          },
        },
      );

    return response.data;
  }

  async function lookupMemberReturns(
    barcode: string,
  ): Promise<MemberReturnLookup> {
    const response =
      await auth.authFetch<
        DataResponse<MemberReturnLookup>
      >(
        `/api/circulation/returns/member/${encodePath(
          barcode,
        )}`,
        {
          method: "GET",
        },
      );

    return response.data;
  }

  async function processReturns(input: {
    items: BatchReturnInputItem[];
  }): Promise<BatchReturnResult> {
    const response =
      await auth.authFetch<
        DataResponse<BatchReturnResult>
      >(
        "/api/circulation/returns/process-batch",
        {
          method: "POST",
          body: {
            data: input,
          },
        },
      );

    return response.data;
  }

  async function lookupReturn(
    barcode: string,
  ): Promise<ReturnLookup> {
    const response =
      await auth.authFetch<
        DataResponse<ReturnLookup>
      >(
        `/api/circulation/returns/lookup/${encodePath(
          barcode,
        )}`,
        {
          method: "GET",
        },
      );

    return response.data;
  }

  async function processReturn(input: {
    borrowDocumentId: string;
    condition: "Good" | "Damaged" | "Lost";
    fineAmount?: number;
    remarks?: string;
  }): Promise<ProcessReturnResult> {
    const response =
      await auth.authFetch<
        DataResponse<ProcessReturnResult>
      >(
        "/api/circulation/returns/process",
        {
          method: "POST",
          body: {
            data: input,
          },
        },
      );

    return response.data;
  }

  async function todayReturns(): Promise<
    TodayReturn[]
  > {
    const response =
      await auth.authFetch<
        DataResponse<TodayReturn[]>
      >(
        "/api/circulation/returns/today",
        {
          method: "GET",
        },
      );

    return response.data;
  }

  async function listReservations(input: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ReservationListResponse> {
    return await auth.authFetch<
      ReservationListResponse
    >("/api/circulation/reservations", {
      method: "GET",
      query: {
        ...input,
        _refresh: Date.now(),
      },
      cache: "no-store",
    });
  }

  async function searchReservationBooks(
    search: string,
  ): Promise<ReservationBook[]> {
    const response =
      await auth.authFetch<
        DataResponse<ReservationBook[]>
      >(
        "/api/circulation/reservation-books",
        {
          method: "GET",
          query: {
            search,
          },
        },
      );

    return response.data;
  }

  async function createReservation(input: {
    memberType: MemberType;
    memberDocumentId: string;
    bookDocumentId: string;
    expirationDate: string;
    remarks?: string;
  }) {
    const response =
      await auth.authFetch<
        DataResponse<{
          documentId: string;
          reservationNo: string;
          status: ReservationStatus;
          expirationDate: string;
          book: ReservationBook;
        }>
      >("/api/circulation/reservations", {
        method: "POST",
        body: {
          data: input,
        },
      });

    return response.data;
  }

  async function updateReservationStatus(
    documentId: string,
    status: ReservationStatus,
  ) {
    const response =
      await auth.authFetch<
        DataResponse<{
          documentId: string;
          reservationNo: string;
          status: ReservationStatus;
        }>
      >(
        `/api/circulation/reservations/${encodePath(
          documentId,
        )}/status`,
        {
          method: "PATCH",
          body: {
            data: {
              status,
            },
          },
        },
      );

    return response.data;
  }

  async function checkoutReservation(
    documentId: string,
    input: {
      copyBarcode: string;
      dueDate?: string;
      remarks?: string;
    },
  ) {
    const response = await auth.authFetch<
      DataResponse<{
        reservation: {
          documentId: string;
          reservationNo: string;
          status: "Completed";
        };
        checkoutReference: string;
        transaction: BorrowResult["transactions"][number];
      }>
    >(
      `/api/circulation/reservations/${encodePath(
        documentId,
      )}/checkout`,
      {
        method: "POST",
        body: { data: input },
      },
    );

    return response.data;
  }

  return {
    lookupMember,
    lookupCopy,
    borrowBooks,
    recentBorrows,
    lookupMemberReturns,
    processReturns,
    lookupReturn,
    processReturn,
    todayReturns,
    listReservations,
    searchReservationBooks,
    createReservation,
    updateReservationStatus,
    checkoutReservation,
  };
}
