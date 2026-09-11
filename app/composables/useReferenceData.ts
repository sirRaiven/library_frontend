export interface ReferenceOption {
  documentId: string;
  code: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface AcademicProgramOption extends ReferenceOption {
  shortName: string | null;
  educationalLevelCode: string;
}

export interface ProgramYearLevelOption extends ReferenceOption {
  value: number;
  label: string;
  programCode: string;
}

export interface AcademicTermOption extends ReferenceOption {
  academicYear: string;
  semesterCode: string;
  semesterName: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
}

export interface ReferenceDataPayload {
  educationalLevels: ReferenceOption[];
  academicPrograms: AcademicProgramOption[];
  programYearLevels: ProgramYearLevelOption[];
  facultyDepartments: ReferenceOption[];
  facultyEmploymentTypes: ReferenceOption[];
  librarianPositions: ReferenceOption[];
  bookCategories: ReferenceOption[];
  shelfLocations: ReferenceOption[];
  academicSemesters: ReferenceOption[];
  academicTerms: AcademicTermOption[];
  currentAcademicTerm: AcademicTermOption | null;
}

type ReferenceDataResponse = {
  data: Partial<ReferenceDataPayload> | null;
};


export function sanitizeReferenceOptions<T extends ReferenceOption>(
  items: T[] | undefined | null,
): T[] {
  return (items ?? [])
    .filter(
      (item) =>
        typeof item?.code === "string" &&
        typeof item?.name === "string" &&
        item.code.trim().length > 0 &&
        item.name.trim().length > 0,
    )
    .map((item) => ({
      ...item,
      code: item.code.trim(),
      name: item.name.trim(),
    }));
}

export function emptyReferenceDataPayload(): ReferenceDataPayload {
  return {
    educationalLevels: [],
    academicPrograms: [],
    programYearLevels: [],
    facultyDepartments: [],
    facultyEmploymentTypes: [],
    librarianPositions: [],
    bookCategories: [],
    shelfLocations: [],
    academicSemesters: [],
    academicTerms: [],
    currentAcademicTerm: null,
  };
}

export function normalizeReferenceDataPayload(
  value?: Partial<ReferenceDataPayload> | null,
): ReferenceDataPayload {
  return {
    ...emptyReferenceDataPayload(),
    ...(value ?? {}),
    educationalLevels: sanitizeReferenceOptions(value?.educationalLevels),
    academicPrograms: sanitizeReferenceOptions(value?.academicPrograms),
    programYearLevels: sanitizeReferenceOptions(value?.programYearLevels),
    facultyDepartments: sanitizeReferenceOptions(value?.facultyDepartments),
    facultyEmploymentTypes: sanitizeReferenceOptions(value?.facultyEmploymentTypes),
    librarianPositions: sanitizeReferenceOptions(value?.librarianPositions),
    bookCategories: sanitizeReferenceOptions(value?.bookCategories),
    shelfLocations: sanitizeReferenceOptions(value?.shelfLocations),
    academicSemesters: sanitizeReferenceOptions(value?.academicSemesters),
    academicTerms: sanitizeReferenceOptions(value?.academicTerms),
    currentAcademicTerm: value?.currentAcademicTerm ?? null,
  };
}

export function programsForEducationalLevel(
  data: Pick<ReferenceDataPayload, "academicPrograms">,
  levelCode: string,
): AcademicProgramOption[] {
  return data.academicPrograms.filter(
    (program) =>
      program.active !== false &&
      program.educationalLevelCode === levelCode,
  );
}

export function yearLevelsForAcademicProgram(
  data: Pick<ReferenceDataPayload, "programYearLevels">,
  programCode: string,
): ProgramYearLevelOption[] {
  return data.programYearLevels.filter(
    (yearLevel) =>
      yearLevel.active !== false &&
      yearLevel.programCode === programCode,
  );
}

export function useReferenceData() {
  const config = useRuntimeConfig();
  const auth = useAuth();
  const apiBase = String(config.public.strapiUrl ?? "").replace(/\/$/, "");

  const publicRequest = useAsyncData<ReferenceDataPayload>(
    "reference-data-public-student-registration",
    async () => {
      const response = await $fetch<ReferenceDataResponse>(
        `${apiBase}/api/reference-data/public/student-registration`,
        { credentials: "include" },
      );
      return normalizeReferenceDataPayload(response.data);
    },
    {
      immediate: false,
      default: emptyReferenceDataPayload,
    },
  );

  const operationalRequest = useAsyncData<ReferenceDataPayload>(
    "reference-data-operational",
    async () => {
      const response = await auth.authFetch<ReferenceDataResponse>(
        "/api/reference-data/options",
      );
      return normalizeReferenceDataPayload(response.data);
    },
    {
      immediate: false,
      default: emptyReferenceDataPayload,
    },
  );

  const publicLoaded = computed(() => publicRequest.status.value === "success");
  const operationalLoaded = computed(
    () => operationalRequest.status.value === "success",
  );
  const publicLoading = computed(() => publicRequest.status.value === "pending");
  const operationalLoading = computed(
    () => operationalRequest.status.value === "pending",
  );

  const data = computed<ReferenceDataPayload>(() =>
    operationalLoaded.value
      ? operationalRequest.data.value
      : publicRequest.data.value,
  );

  const educationalLevels = computed(() => data.value.educationalLevels);
  const academicPrograms = computed(() => data.value.academicPrograms);
  const programYearLevels = computed(() => data.value.programYearLevels);
  const facultyDepartments = computed(() => data.value.facultyDepartments);
  const facultyEmploymentTypes = computed(
    () => data.value.facultyEmploymentTypes,
  );
  const librarianPositions = computed(() => data.value.librarianPositions);
  const bookCategories = computed(() => data.value.bookCategories);
  const shelfLocations = computed(() => data.value.shelfLocations);
  const academicSemesters = computed(() => data.value.academicSemesters);
  const academicTerms = computed(() => data.value.academicTerms);
  const currentAcademicTerm = computed(() => data.value.currentAcademicTerm);

  async function loadPublicStudentRegistration(force = false) {
    if (publicLoaded.value && !force) return publicRequest.data.value;
    await publicRequest.execute({ dedupe: "defer" });
    if (publicRequest.error.value) throw publicRequest.error.value;
    return publicRequest.data.value;
  }

  async function loadOperational(force = false) {
    if (operationalLoaded.value && !force) return operationalRequest.data.value;
    await operationalRequest.execute({ dedupe: "defer" });
    if (operationalRequest.error.value) throw operationalRequest.error.value;
    return operationalRequest.data.value;
  }

  function programsForLevel(levelCode: string): AcademicProgramOption[] {
    return programsForEducationalLevel(data.value, levelCode);
  }

  function yearLevelsForProgram(programCode: string): ProgramYearLevelOption[] {
    return yearLevelsForAcademicProgram(data.value, programCode);
  }

  async function retry(scope: "public" | "operational" = "operational") {
    return scope === "public"
      ? loadPublicStudentRegistration(true)
      : loadOperational(true);
  }

  return {
    data,
    educationalLevels,
    academicPrograms,
    programYearLevels,
    facultyDepartments,
    facultyEmploymentTypes,
    librarianPositions,
    bookCategories,
    shelfLocations,
    academicSemesters,
    academicTerms,
    currentAcademicTerm,
    publicLoaded,
    operationalLoaded,
    publicLoading,
    operationalLoading,
    publicError: computed(() => publicRequest.error.value),
    operationalError: computed(() => operationalRequest.error.value),
    loading: computed(
      () => publicLoading.value || operationalLoading.value,
    ),
    loaded: computed(
      () => publicLoaded.value || operationalLoaded.value,
    ),
    error: computed(
      () => operationalRequest.error.value ?? publicRequest.error.value,
    ),
    loadPublicStudentRegistration,
    loadOperational,
    programsForLevel,
    yearLevelsForProgram,
    retry,
  };
}
