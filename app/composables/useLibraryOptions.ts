export interface LibrarySelectOption {
  label: string;
  value: string;
  source?: "builtin" | "custom" | "historical";
  active?: boolean;
  parentValue?: string;
}

type RawLibraryOption = {
  value?: unknown;
  label?: unknown;
  code?: unknown;
  name?: unknown;
  source?: unknown;
  active?: unknown;
  parentValue?: unknown;
  parent_value?: unknown;
  educationalLevel?: unknown;
  educationalLevelCode?: unknown;
};

export interface LibraryAcademicTermOption {
  documentId: string;
  code: string;
  name: string;
  active: boolean;
  academicYear: string;
  semesterCode: string;
  semesterName: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
}

export type AcademicTermOption = LibraryAcademicTermOption;

type RawAcademicTermOption = {
  documentId?: unknown;
  code?: unknown;
  name?: unknown;
  active?: unknown;
  academicYear?: unknown;
  semesterCode?: unknown;
  semesterName?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  isCurrent?: unknown;
};

type RawLibraryOptionsPayload = {
  educationalLevels?: RawLibraryOption[];
  studentPrograms?: RawLibraryOption[];
  academicPrograms?: RawLibraryOption[];
  facultyDepartments?: RawLibraryOption[];
  facultyEmploymentTypes?: RawLibraryOption[];
  librarianPositions?: RawLibraryOption[];
  bookCategories?: RawLibraryOption[];
  shelfLocations?: RawLibraryOption[];
  semesters?: RawLibraryOption[];
  academicSemesters?: RawLibraryOption[];
  academicTerms?: RawAcademicTermOption[];
  currentAcademicTerm?: RawAcademicTermOption | null;
};

type LibraryOptionsResponse = {
  data?: RawLibraryOptionsPayload | null;
};

const RESERVED_VALUES = new Set(["", "__all__", "__none__"]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function sourceOf(value: unknown): LibrarySelectOption["source"] | undefined {
  const normalized = text(value).toLocaleLowerCase();
  if (normalized === "builtin") return "builtin";
  if (normalized === "custom" || normalized === "administrator") return "custom";
  if (normalized === "historical") return "historical";
  return undefined;
}

function optionFromRaw(item: RawLibraryOption): LibrarySelectOption | null {
  // The final registry uses value/label and may also expose code/name aliases
  // for API compatibility. Persisted business values remain the authoritative strings.
  const value = text(item.value) || text(item.name) || text(item.code);
  const label = text(item.label) || text(item.name) || value;
  const parentValue =
    text(item.parentValue) ||
    text(item.parent_value) ||
    text(item.educationalLevel) ||
    text(item.educationalLevelCode);

  if (!value || !label || RESERVED_VALUES.has(normalizedKey(value))) return null;
  if (item.active === false) return null;

  return {
    value,
    label,
    active: item.active !== false,
    source: sourceOf(item.source),
    ...(parentValue ? { parentValue } : {}),
  };
}

export function sanitizeLibraryOptions(
  items: RawLibraryOption[] | null | undefined,
): LibrarySelectOption[] {
  const seen = new Set<string>();
  const result: LibrarySelectOption[] = [];

  for (const raw of items ?? []) {
    const item = optionFromRaw(raw);
    if (!item) continue;

    const key = normalizedKey(item.value);
    if (!key || RESERVED_VALUES.has(key) || seen.has(key)) continue;

    seen.add(key);
    result.push(item);
  }

  return result;
}

export function withHistoricalLibraryOption(
  options: LibrarySelectOption[],
  currentValue: unknown,
  label?: string,
): LibrarySelectOption[] {
  const value = text(currentValue);
  if (!value) return options;

  const key = normalizedKey(value);
  if (options.some(option => normalizedKey(option.value) === key)) return options;

  return [
    {
      value,
      label: text(label) || value,
      source: "historical",
      active: false,
    },
    ...options,
  ];
}


function academicTermFromRaw(item: RawAcademicTermOption | null | undefined): LibraryAcademicTermOption | null {
  if (!item) return null;
  const code = text(item.code);
  const name = text(item.name);
  const academicYear = text(item.academicYear);
  const semesterName = text(item.semesterName) || text(item.semesterCode);
  if (!code || !name || !academicYear || !semesterName) return null;
  return {
    documentId: text(item.documentId),
    code,
    name,
    active: item.active !== false,
    academicYear,
    semesterCode: text(item.semesterCode) || semesterName,
    semesterName,
    startDate: text(item.startDate) || null,
    endDate: text(item.endDate) || null,
    isCurrent: item.isCurrent === true,
  };
}

function userFacingOptionError(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { error?: { message?: string } } }).data;
    const message = text(data?.error?.message);
    if (message) return message;
  }

  return "Library options could not be loaded. Please try again.";
}

function yearValues(level: string): number[] {
  const normalized = normalizedKey(level);
  if (normalized === "college") return [1, 2, 3, 4, 5];
  if (normalized === "diploma") return [1, 2, 3];
  if (normalized === "senior high school") return [11, 12];
  return [];
}

export function useLibraryOptions() {
  const config = useRuntimeConfig();
  const auth = useAuth();
  const apiBase = String(config.public.strapiUrl ?? "").replace(/\/$/, "");

  const publicPayload = ref<RawLibraryOptionsPayload>({});
  const operationalPayload = ref<RawLibraryOptionsPayload>({});
  const publicLoaded = ref(false);
  const operationalLoaded = ref(false);
  const publicLoading = ref(false);
  const operationalLoading = ref(false);
  const errorMessage = ref("");

  const activePayload = computed(() =>
    operationalLoaded.value ? operationalPayload.value : publicPayload.value,
  );

  const educationalLevels = computed(() =>
    sanitizeLibraryOptions(activePayload.value.educationalLevels),
  );
  const studentPrograms = computed(() =>
    sanitizeLibraryOptions(
      activePayload.value.studentPrograms ?? activePayload.value.academicPrograms,
    ),
  );
  const facultyDepartments = computed(() =>
    sanitizeLibraryOptions(activePayload.value.facultyDepartments),
  );
  const facultyEmploymentTypes = computed(() =>
    sanitizeLibraryOptions(activePayload.value.facultyEmploymentTypes),
  );
  const librarianPositions = computed(() =>
    sanitizeLibraryOptions(activePayload.value.librarianPositions),
  );
  const bookCategories = computed(() =>
    sanitizeLibraryOptions(activePayload.value.bookCategories),
  );
  const shelfLocations = computed(() =>
    sanitizeLibraryOptions(activePayload.value.shelfLocations),
  );
  const semesters = computed(() =>
    sanitizeLibraryOptions(
      activePayload.value.semesters ?? activePayload.value.academicSemesters,
    ),
  );
  const academicTerms = computed(() =>
    (activePayload.value.academicTerms ?? [])
      .map(academicTermFromRaw)
      .filter((item): item is LibraryAcademicTermOption => Boolean(item && item.active)),
  );
  const currentAcademicTerm = computed(() =>
    academicTermFromRaw(activePayload.value.currentAcademicTerm)
      ?? academicTerms.value.find(item => item.isCurrent)
      ?? null,
  );

  const loading = computed(
    () => publicLoading.value || operationalLoading.value,
  );
  const error = computed(() => errorMessage.value);

  async function loadPublicRegistration(force = false): Promise<void> {
    if (publicLoaded.value && !force) return;

    publicLoading.value = true;
    errorMessage.value = "";
    try {
      const response = await $fetch<LibraryOptionsResponse>(
        `${apiBase}/api/reference-data/public/student-registration`,
        { credentials: "include" },
      );
      publicPayload.value = response.data ?? {};
      publicLoaded.value = true;
    } catch (cause) {
      errorMessage.value = userFacingOptionError(cause);
      throw cause;
    } finally {
      publicLoading.value = false;
    }
  }

  async function loadOperational(force = false): Promise<void> {
    if (operationalLoaded.value && !force) return;

    operationalLoading.value = true;
    errorMessage.value = "";
    try {
      const response = await auth.authFetch<LibraryOptionsResponse>(
        "/api/reference-data/options",
      );
      operationalPayload.value = response.data ?? {};
      operationalLoaded.value = true;
    } catch (cause) {
      errorMessage.value = userFacingOptionError(cause);
      throw cause;
    } finally {
      operationalLoading.value = false;
    }
  }

  async function retry(
    scope: "public" | "operational" = "operational",
  ): Promise<void> {
    if (scope === "public") {
      await loadPublicRegistration(true);
      return;
    }

    await loadOperational(true);
  }

  function withHistoricalValue(
    options: LibrarySelectOption[],
    currentValue: unknown,
    label?: string,
  ) {
    return withHistoricalLibraryOption(options, currentValue, label);
  }

  function programsForEducationalLevel(level: string) {
    const key = normalizedKey(level);
    return studentPrograms.value.filter(option => {
      if (!option.parentValue) return true;
      return normalizedKey(option.parentValue) === key;
    });
  }

  function yearLevelsForEducationalLevel(level: string): LibrarySelectOption[] {
    return yearValues(level).map(value => ({
      value: String(value),
      label: String(value),
      source: "builtin",
      active: true,
    }));
  }

  return {
    educationalLevels,
    studentPrograms,
    facultyDepartments,
    facultyEmploymentTypes,
    librarianPositions,
    bookCategories,
    shelfLocations,
    semesters,
    academicTerms,
    currentAcademicTerm,
    loading,
    error,
    publicLoaded: computed(() => publicLoaded.value),
    operationalLoaded: computed(() => operationalLoaded.value),
    loadPublicRegistration,
    loadPublicStudentRegistration: loadPublicRegistration,
    loadOperational,
    retry,
    withHistoricalValue,
    programsForEducationalLevel,
    yearLevelsForEducationalLevel,
  };
}
