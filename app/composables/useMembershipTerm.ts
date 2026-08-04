export type MembershipTermStatus = "Open" | "Closed";

export interface MembershipTermSummary {
  studentsReviewed: number;
  membershipsCreated: number;
  membershipsUpdated: number;
  priorMembershipsExpired: number;
  activeForTerm: number;
  pendingVerification: number;
}

export interface MembershipTerm {
  version: number;
  academicYear: string;
  semester: "First Semester" | "Second Semester" | "Summer";
  status: MembershipTermStatus;
  registrationOpen: boolean;
  validFrom: string;
  validUntil: string;
  openedAt: string | null;
  openedBy: string | null;
  requireEnrollmentVerification: boolean;
  summary: MembershipTermSummary;
}

export interface UpdateMembershipTermInput {
  academicYear: string;
  semester: MembershipTerm["semester"];
  status: MembershipTermStatus;
  registrationOpen: boolean;
  validFrom: string;
  validUntil: string;
  applyToAll: boolean;
}

function fallbackTerm(): MembershipTerm {
  const today = new Date().toISOString().slice(0, 10);
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + 5);
  const year = new Date().getFullYear();

  return {
    version: 1,
    academicYear: `${year}-${year + 1}`,
    semester: "First Semester",
    status: "Open",
    registrationOpen: true,
    validFrom: today,
    validUntil: expiry.toISOString().slice(0, 10),
    openedAt: null,
    openedBy: null,
    requireEnrollmentVerification: true,
    summary: {
      studentsReviewed: 0,
      membershipsCreated: 0,
      membershipsUpdated: 0,
      priorMembershipsExpired: 0,
      activeForTerm: 0,
      pendingVerification: 0,
    },
  };
}

export function useMembershipTerm() {
  const auth = useAuth();
  const term = useState<MembershipTerm>(
    "librarian-membership-term",
    fallbackTerm,
  );
  const loaded = useState<boolean>(
    "librarian-membership-term-loaded",
    () => false,
  );
  const loading = useState<boolean>(
    "librarian-membership-term-loading",
    () => false,
  );

  async function load(force = false) {
    if (loaded.value && !force) return term.value;
    loading.value = true;
    try {
      const response = await auth.authFetch<{ data: MembershipTerm }>(
        "/api/library-memberships/term",
      );
      term.value = response.data;
      loaded.value = true;
      return term.value;
    } finally {
      loading.value = false;
    }
  }

  async function save(input: UpdateMembershipTermInput) {
    loading.value = true;
    try {
      const response = await auth.authFetch<{ data: MembershipTerm }>(
        "/api/library-memberships/term",
        {
          method: "PUT",
          body: { data: input },
        },
      );
      term.value = response.data;
      loaded.value = true;
      return response.data;
    } finally {
      loading.value = false;
    }
  }

  return {
    term: readonly(term),
    loaded: readonly(loaded),
    loading: readonly(loading),
    load,
    save,
  };
}
