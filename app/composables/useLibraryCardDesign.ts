export type LibraryCardFrontLayout =
  | "cinematic"
  | "split"
  | "minimal";

export type LibraryCardBackStyle =
  | "navy"
  | "light";

export type LibraryCardPhotoShape =
  | "rounded"
  | "square"
  | "circle";

export interface LibraryCardDesign {
  designName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;

  frontLayout: LibraryCardFrontLayout;
  backStyle: LibraryCardBackStyle;
  backgroundMode:
    | "image"
    | "gradient"
    | "solid";
  backgroundImage: string;
  backgroundPosition: string;
  overlayOpacity: number;
  cornerRadius: number;
  fontScale: number;

  photoShape: LibraryCardPhotoShape;
  photoBorderColor: string;
  logoUrl: string;
  showLogo: boolean;
  showPhoto: boolean;
  showStudentNumber: boolean;
  showCourse: boolean;
  showCardNumber: boolean;
  showMembershipStatus: boolean;
  showValidityTable: boolean;
  showBarcode: boolean;

  institutionName: string;
  cardTitle: string;
  departmentLabel: string;
  frontTagline: string;
  noticeText: string;
  validityTitle: string;
  librarianLabel: string;
  backFooterText: string;
}

export const DEFAULT_LIBRARY_CARD_DESIGN:
  LibraryCardDesign = {
    designName:
      "SNCBT Modern Building",

    primaryColor: "#0B1F3A",
    secondaryColor: "#173A63",
    accentColor: "#38BDF8",
    surfaceColor: "#FFFFFF",
    textColor: "#FFFFFF",
    mutedTextColor: "#CBD5E1",

    frontLayout: "cinematic",
    backStyle: "navy",
    backgroundMode: "image",
    backgroundImage:
      "/library-card/sncbt-building.jpg",
    backgroundPosition: "center 45%",
    overlayOpacity: 78,
    cornerRadius: 22,
    fontScale: 100,

    photoShape: "rounded",
    photoBorderColor: "#FFFFFF",
    logoUrl: "/sncbt-logo.png",
    showLogo: true,
    showPhoto: true,
    showStudentNumber: true,
    showCourse: true,
    showCardNumber: true,
    showMembershipStatus: true,
    showValidityTable: true,
    showBarcode: true,

    institutionName:
      "ST. NICOLAS COLLEGE OF BUSINESS AND TECHNOLOGY",
    cardTitle: "STUDENT LIBRARY CARD",
    departmentLabel: "COLLEGE DEPARTMENT",
    frontTagline:
      "Knowledge • Access • Service",
    noticeText:
      "VALID LIBRARY CARD REQUIRED FOR ALL TRANSACTIONS",
    validityTitle:
      "SEMESTER MEMBERSHIP VALIDITY",
    librarianLabel:
      "AUTHORIZED LIBRARIAN",
    backFooterText:
      "This card remains the property of SNCBT Library.",
  };

export const LIBRARY_CARD_PRESETS:
  Record<string, LibraryCardDesign> = {
    building: {
      ...DEFAULT_LIBRARY_CARD_DESIGN,
      designName:
        "SNCBT Modern Building",
    },

    gradient: {
      ...DEFAULT_LIBRARY_CARD_DESIGN,
      designName:
        "Navy Aurora",
      backgroundMode: "gradient",
      backgroundImage: "",
      frontLayout: "split",
      primaryColor: "#071A33",
      secondaryColor: "#1E3A5F",
      accentColor: "#22D3EE",
      overlayOpacity: 86,
    },

    minimal: {
      ...DEFAULT_LIBRARY_CARD_DESIGN,
      designName:
        "Minimal Academic",
      backgroundMode: "solid",
      backgroundImage: "",
      frontLayout: "minimal",
      backStyle: "light",
      primaryColor: "#0F2747",
      secondaryColor: "#E8EEF6",
      accentColor: "#2563EB",
      surfaceColor: "#FFFFFF",
      textColor: "#0F172A",
      mutedTextColor: "#475569",
      overlayOpacity: 0,
    },
  };

function clamp(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(
    Math.max(numberValue, min),
    max,
  );
}

function stringValue(
  value: unknown,
  fallback: string,
): string {
  return typeof value === "string"
    ? value
    : fallback;
}

function booleanValue(
  value: unknown,
  fallback: boolean,
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
}

export function normalizeLibraryCardDesign(
  input?: Partial<LibraryCardDesign> | null,
): LibraryCardDesign {
  const value = input ?? {};

  return {
    ...DEFAULT_LIBRARY_CARD_DESIGN,
    ...value,

    designName: stringValue(
      value.designName,
      DEFAULT_LIBRARY_CARD_DESIGN.designName,
    ),

    primaryColor: stringValue(
      value.primaryColor,
      DEFAULT_LIBRARY_CARD_DESIGN.primaryColor,
    ),
    secondaryColor: stringValue(
      value.secondaryColor,
      DEFAULT_LIBRARY_CARD_DESIGN.secondaryColor,
    ),
    accentColor: stringValue(
      value.accentColor,
      DEFAULT_LIBRARY_CARD_DESIGN.accentColor,
    ),
    surfaceColor: stringValue(
      value.surfaceColor,
      DEFAULT_LIBRARY_CARD_DESIGN.surfaceColor,
    ),
    textColor: stringValue(
      value.textColor,
      DEFAULT_LIBRARY_CARD_DESIGN.textColor,
    ),
    mutedTextColor: stringValue(
      value.mutedTextColor,
      DEFAULT_LIBRARY_CARD_DESIGN.mutedTextColor,
    ),

    backgroundImage: stringValue(
      value.backgroundImage,
      DEFAULT_LIBRARY_CARD_DESIGN.backgroundImage,
    ),
    backgroundPosition: stringValue(
      value.backgroundPosition,
      DEFAULT_LIBRARY_CARD_DESIGN.backgroundPosition,
    ),

    overlayOpacity: clamp(
      value.overlayOpacity,
      0,
      100,
      DEFAULT_LIBRARY_CARD_DESIGN.overlayOpacity,
    ),
    cornerRadius: clamp(
      value.cornerRadius,
      0,
      40,
      DEFAULT_LIBRARY_CARD_DESIGN.cornerRadius,
    ),
    fontScale: clamp(
      value.fontScale,
      80,
      125,
      DEFAULT_LIBRARY_CARD_DESIGN.fontScale,
    ),

    showLogo: booleanValue(
      value.showLogo,
      DEFAULT_LIBRARY_CARD_DESIGN.showLogo,
    ),
    showPhoto: booleanValue(
      value.showPhoto,
      DEFAULT_LIBRARY_CARD_DESIGN.showPhoto,
    ),
    showStudentNumber: booleanValue(
      value.showStudentNumber,
      DEFAULT_LIBRARY_CARD_DESIGN.showStudentNumber,
    ),
    showCourse: booleanValue(
      value.showCourse,
      DEFAULT_LIBRARY_CARD_DESIGN.showCourse,
    ),
    showCardNumber: booleanValue(
      value.showCardNumber,
      DEFAULT_LIBRARY_CARD_DESIGN.showCardNumber,
    ),
    showMembershipStatus: booleanValue(
      value.showMembershipStatus,
      DEFAULT_LIBRARY_CARD_DESIGN.showMembershipStatus,
    ),
    showValidityTable: booleanValue(
      value.showValidityTable,
      DEFAULT_LIBRARY_CARD_DESIGN.showValidityTable,
    ),
    showBarcode: booleanValue(
      value.showBarcode,
      DEFAULT_LIBRARY_CARD_DESIGN.showBarcode,
    ),

    institutionName: stringValue(
      value.institutionName,
      DEFAULT_LIBRARY_CARD_DESIGN.institutionName,
    ),
    cardTitle: stringValue(
      value.cardTitle,
      DEFAULT_LIBRARY_CARD_DESIGN.cardTitle,
    ),
    departmentLabel: stringValue(
      value.departmentLabel,
      DEFAULT_LIBRARY_CARD_DESIGN.departmentLabel,
    ),
    frontTagline: stringValue(
      value.frontTagline,
      DEFAULT_LIBRARY_CARD_DESIGN.frontTagline,
    ),
    noticeText: stringValue(
      value.noticeText,
      DEFAULT_LIBRARY_CARD_DESIGN.noticeText,
    ),
    validityTitle: stringValue(
      value.validityTitle,
      DEFAULT_LIBRARY_CARD_DESIGN.validityTitle,
    ),
    librarianLabel: stringValue(
      value.librarianLabel,
      DEFAULT_LIBRARY_CARD_DESIGN.librarianLabel,
    ),
    backFooterText: stringValue(
      value.backFooterText,
      DEFAULT_LIBRARY_CARD_DESIGN.backFooterText,
    ),
  };
}

export function cloneLibraryCardDesign(
  input: LibraryCardDesign,
): LibraryCardDesign {
  return JSON.parse(
    JSON.stringify(input),
  ) as LibraryCardDesign;
}

interface StrapiSingleTypeResponse {
  data?: {
    documentId?: string;
    design_name?: string;
    design_config?: Partial<LibraryCardDesign>;
    attributes?: {
      design_name?: string;
      design_config?: Partial<LibraryCardDesign>;
    };
  } | null;
}

export function useLibraryCardDesign() {
  const auth = useAuth();
  const runtimeConfig = useRuntimeConfig();

  const design =
    useState<LibraryCardDesign>(
      "library-card-design",
      () =>
        cloneLibraryCardDesign(
          DEFAULT_LIBRARY_CARD_DESIGN,
        ),
    );

  const loaded = useState<boolean>(
    "library-card-design-loaded",
    () => false,
  );

  const loading = useState<boolean>(
    "library-card-design-loading",
    () => false,
  );

  const saving = useState<boolean>(
    "library-card-design-saving",
    () => false,
  );

  function assetUrl(
    value?: string | null,
  ): string {
    const source = value?.trim() ?? "";

    if (!source) {
      return "";
    }

    if (
      source.startsWith("http://") ||
      source.startsWith("https://") ||
      source.startsWith("data:") ||
      source.startsWith("blob:")
    ) {
      return source;
    }

    if (source.startsWith("/uploads/")) {
      const strapiUrl = String(
        runtimeConfig.public.strapiUrl ??
          "http://localhost:1337",
      ).replace(/\/$/, "");

      return `${strapiUrl}${source}`;
    }

    return source;
  }

  function unwrap(
    response: StrapiSingleTypeResponse,
  ): LibraryCardDesign {
    const record = response.data;

    if (!record) {
      return cloneLibraryCardDesign(
        DEFAULT_LIBRARY_CARD_DESIGN,
      );
    }

    const config =
      record.design_config ??
      record.attributes?.design_config ??
      null;

    return normalizeLibraryCardDesign(
      config,
    );
  }

  async function loadDesign(
    force = false,
  ): Promise<LibraryCardDesign> {
    if (
      loaded.value &&
      !force
    ) {
      return design.value;
    }

    loading.value = true;

    try {
      const response =
        await auth.authFetch<
          StrapiSingleTypeResponse
        >("/api/library-card-design/managed", {
          method: "GET",
        });

      design.value = unwrap(response);
    } catch (error: any) {
      const status =
        Number(
          error?.statusCode ??
            error?.status ??
            error?.response?.status,
        ) || 0;

      if (
        status !== 404 &&
        status !== 403
      ) {
        console.warn(
          "Library card design could not be loaded. The default design will be used.",
          error,
        );
      }

      design.value =
        cloneLibraryCardDesign(
          DEFAULT_LIBRARY_CARD_DESIGN,
        );
    } finally {
      loading.value = false;
      loaded.value = true;
    }

    return design.value;
  }

  async function saveDesign(
    input: Partial<LibraryCardDesign>,
  ): Promise<LibraryCardDesign> {
    const normalized =
      normalizeLibraryCardDesign(input);

    saving.value = true;

    try {
      const response =
        await auth.authFetch<
          StrapiSingleTypeResponse
        >("/api/library-card-design/managed", {
          method: "PUT",
          body: {
            data: {
              design_name:
                normalized.designName,
              design_config:
                normalized,
            },
          },
        });

      design.value =
        response.data
          ? unwrap(response)
          : normalized;

      loaded.value = true;

      return design.value;
    } finally {
      saving.value = false;
    }
  }

  async function uploadAsset(
    file: File,
  ): Promise<string> {
    const formData = new FormData();
    formData.append("files", file);

    const response =
      await auth.authFetch<
        Array<{
          url?: string;
        }>
      >("/api/upload", {
        method: "POST",
        body: formData,
      });

    const url =
      response?.[0]?.url;

    if (!url) {
      throw new Error(
        "The uploaded image did not return a usable URL.",
      );
    }

    return url;
  }

  function applyLocalDesign(
    input: Partial<LibraryCardDesign>,
  ) {
    design.value =
      normalizeLibraryCardDesign(input);
    loaded.value = true;
  }

  function resetLocalDesign() {
    design.value =
      cloneLibraryCardDesign(
        DEFAULT_LIBRARY_CARD_DESIGN,
      );
    loaded.value = true;
  }

  return {
    design,
    loaded,
    loading,
    saving,
    assetUrl,
    loadDesign,
    saveDesign,
    uploadAsset,
    applyLocalDesign,
    resetLocalDesign,
  };
}
