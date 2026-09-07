export type AdminSettingsSection =
  | "general"
  | "borrowing"
  | "membership"
  | "reservations"
  | "fines";

export interface GeneralLibrarySettings {
  institutionName: string;
  libraryName: string;
  institutionAddress: string;
  contactEmail: string;
  contactNumber: string;
  timeZone: "Asia/Manila";
  currentAcademicYear: string;
  currentSemester: string;
}

export interface BorrowingLibrarySettings {
  studentBorrowLimit: number;
  facultyBorrowLimit: number;
  studentLoanDays: number;
  facultyLoanDays: number;
  studentMaxRenewals: number;
  facultyMaxRenewals: number;
  allowBorrowWithOverdue: boolean;
  allowBorrowWithUnpaidFine: boolean;
}

export interface MembershipLibrarySettings {
  validityMonths: number;
  requireActiveStudentMembership: boolean;
  requireEnrollmentVerification: boolean;
  defaultLibraryCardStatus:
    | "None"
    | "On Process"
    | "Printed"
    | "Released";
  libraryCardReplacementFee: number;
}

export interface ReservationLibrarySettings {
  studentMaxActiveReservations: number;
  facultyMaxActiveReservations: number;
  expirationDays: number;
  pickupDays: number;
  allowReserveAvailableBooks: boolean;
}

export interface FineLibrarySettings {
  overdueFinePerDay: number;
  graceDays: number;
  maximumOverdueFine: number;
  damagedBookFee: number;
  lostBookProcessingFee: number;
}

export interface AdminLibrarySettings {
  id: number;
  documentId?: string;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
  general: GeneralLibrarySettings;
  borrowing: BorrowingLibrarySettings;
  membership: MembershipLibrarySettings;
  reservations: ReservationLibrarySettings;
  fines: FineLibrarySettings;
}

export function useAdminSettings() {
  const auth = useAuth();

  async function get() {
    const response = await auth.authFetch<{
      data: AdminLibrarySettings;
    }>("/api/admin-management/settings");

    return response.data;
  }

  async function update<K extends AdminSettingsSection>(
    section: K,
    expectedVersion: number,
    values: AdminLibrarySettings[K],
  ) {
    const response = await auth.authFetch<{
      data: AdminLibrarySettings;
    }>(`/api/admin-management/settings/${section}`, {
      method: "PATCH",
      body: {
        data: {
          expectedVersion,
          values,
        },
      },
    });

    return response.data;
  }

  return {
    get,
    update,
  };
}
