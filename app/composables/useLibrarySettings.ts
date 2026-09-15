import type { AcademicTermOption } from "~/composables/useLibraryOptions";
import type {
  BorrowingLibrarySettings,
  FineLibrarySettings,
  MembershipLibrarySettings,
  ReservationLibrarySettings,
} from "~/composables/useAdminSettings";

export interface OperationalLibrarySettings {
  version: number;
  general: {
    timeZone: "Asia/Manila";
    currentAcademicYear: string;
    currentSemester: string;
    currentAcademicTerm: AcademicTermOption | null;
  };
  borrowing: BorrowingLibrarySettings;
  membership: MembershipLibrarySettings & {
    term: {
      status: "Open" | "Closed";
      registrationOpen: boolean;
      validFrom: string;
      validUntil: string;
      openedAt: string | null;
      openedBy: string | null;
    };
  };
  reservations: ReservationLibrarySettings;
  fines: FineLibrarySettings;
}

function fallbackSettings(): OperationalLibrarySettings {
  return {
    version: 1,
    general: {
      timeZone: "Asia/Manila",
      currentAcademicYear: "",
      currentSemester: "",
      currentAcademicTerm: null,
    },
    borrowing: {
      studentBorrowLimit: 5,
      facultyBorrowLimit: 10,
      studentLoanDays: 3,
      facultyLoanDays: 365,
      studentMaxRenewals: 1,
      facultyMaxRenewals: 2,
      allowBorrowWithOverdue: false,
      allowBorrowWithUnpaidFine: false,
    },
    membership: {
      validityMonths: 5,
      term: {
        status: "Open",
        registrationOpen: true,
        validFrom: "",
        validUntil: "",
        openedAt: null,
        openedBy: null,
      },
      requireActiveStudentMembership: true,
      requireEnrollmentVerification: true,
      defaultLibraryCardStatus: "On Process",
      libraryCardReplacementFee: 50,
    },
    reservations: {
      studentMaxActiveReservations: 3,
      facultyMaxActiveReservations: 5,
      expirationDays: 3,
      pickupDays: 2,
      allowReserveAvailableBooks: true,
    },
    fines: {
      overdueFinePerDay: 10,
      graceDays: 0,
      maximumOverdueFine: 0,
      damagedBookFee: 0,
      lostBookProcessingFee: 0,
    },
  };
}

export function useLibrarySettings() {
  const auth = useAuth();
  const settings = useState<OperationalLibrarySettings>(
    "operational-library-settings",
    fallbackSettings,
  );
  const loaded = useState<boolean>(
    "operational-library-settings-loaded",
    () => false,
  );
  const loading = useState<boolean>(
    "operational-library-settings-loading",
    () => false,
  );

  async function load(force = false) {
    if (loaded.value && !force) {
      return settings.value;
    }

    if (loading.value) {
      return settings.value;
    }

    loading.value = true;

    try {
      const response = await auth.authFetch<{
        data: OperationalLibrarySettings;
      }>("/api/library-settings/operational");

      settings.value = response.data;
      loaded.value = true;
      return settings.value;
    } finally {
      loading.value = false;
    }
  }

  function dueDateFor(memberType: "Student" | "Faculty" = "Student") {
    const date = new Date();
    const days = memberType === "Faculty"
      ? settings.value.borrowing.facultyLoanDays
      : settings.value.borrowing.studentLoanDays;

    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function reservationExpirationDate() {
    const date = new Date();
    date.setDate(
      date.getDate() + settings.value.reservations.expirationDays,
    );
    return date.toISOString().slice(0, 10);
  }

  function membershipExpiryDate(from = new Date()) {
    if (settings.value.membership.term.validUntil) {
      return settings.value.membership.term.validUntil;
    }

    const date = new Date(from);
    date.setMonth(
      date.getMonth() + settings.value.membership.validityMonths,
    );
    return date.toISOString().slice(0, 10);
  }

  return {
    settings: readonly(settings),
    loaded: readonly(loaded),
    loading: readonly(loading),
    load,
    dueDateFor,
    reservationExpirationDate,
    membershipExpiryDate,
  };
}
