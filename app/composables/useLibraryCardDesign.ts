export type LibraryCardFrontLayout =
  | "cinematic"
  | "classic"
  | "split"
  | "minimal"
  | "glass"
  | "diagonal"
  | "portrait"
  | "modern";

export type LibraryCardBackStyle = "navy" | "light" | "gradient" | "solid";

export type LibraryCardBackLayout =
  | "credential"
  | "profile"
  | "minimal";

export type LibraryCardPhotoShape =
  | "rounded"
  | "square"
  | "circle";

export type LibraryCardPresetCategory =
  | "Institutional"
  | "Modern"
  | "Minimal"
  | "Creative";

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
  backLayout: LibraryCardBackLayout;

  backgroundMode: "image" | "gradient" | "solid";
  backgroundImage: string;
  backgroundPosition: string;
  overlayOpacity: number;
  cornerRadius: number;
  fontScale: number;

  photoShape: LibraryCardPhotoShape;
  photoBorderColor: string;

  /**
   * Institution seal used on the front of the card.
   */
  logoUrl: string;

  /**
   * Independent Library logo used on the back of the card.
   * It may be different from the institution seal.
   */
  backLogoUrl: string;
  backLogoSize: number;

  showLogo: boolean;
  showBackLogo: boolean;
  showPhoto: boolean;
  showStudentNumber: boolean;
  showCourse: boolean;
  showCardNumber: boolean;
  showMembershipStatus: boolean;
  showBarcode: boolean;

  showBackStudentDetails: boolean;
  showYearSection: boolean;
  showEmail: boolean;
  showAddress: boolean;

  institutionName: string;
  cardTitle: string;
  departmentLabel: string;
  frontTagline: string;

  backTitle: string;
  noticeText: string;
  librarianLabel: string;
  backFooterText: string;

  /**
   * Retained only so older saved JSON remains compatible.
   * The redesigned card no longer renders a semester-validity table.
   */
  showValidityTable?: boolean;
  validityTitle?: string;
}

export interface LibraryCardPreset {
  key: string;
  category: LibraryCardPresetCategory;
  name: string;
  description: string;
  icon: string;
  design: LibraryCardDesign;
}

export const DEFAULT_LIBRARY_CARD_DESIGN: LibraryCardDesign = {
  designName: "SNCBT Campus Cinematic",

  primaryColor: "#0B1F3A",
  secondaryColor: "#173A63",
  accentColor: "#38BDF8",
  surfaceColor: "#FFFFFF",
  textColor: "#FFFFFF",
  mutedTextColor: "#CBD5E1",

  frontLayout: "cinematic",
  backStyle: "navy",
  backLayout: "credential",

  backgroundMode: "image",
  backgroundImage: "/library-card/sncbt-building.jpg",
  backgroundPosition: "center 45%",
  overlayOpacity: 78,
  cornerRadius: 22,
  fontScale: 100,

  photoShape: "rounded",
  photoBorderColor: "#FFFFFF",
  logoUrl: "/sncbt-logo.png",

  // Uses the institution seal until the librarian uploads
  // the official Library logo from the Designer.
  backLogoUrl: "/sncbt-library-logo.png",
  backLogoSize: 44,

  showLogo: true,
  showBackLogo: true,
  showPhoto: true,
  showStudentNumber: true,
  showCourse: true,
  showCardNumber: true,

  // The physical card is permanent. Current membership is checked
  // through the barcode, so this is hidden from the printed design.
  showMembershipStatus: false,
  showBarcode: true,

  showBackStudentDetails: true,
  showYearSection: true,
  showEmail: true,
  showAddress: true,

  institutionName: "ST. NICOLAS COLLEGE OF BUSINESS AND TECHNOLOGY",
  cardTitle: "STUDENT LIBRARY CARD",
  departmentLabel: "COLLEGE DEPARTMENT",
  frontTagline: "Learn • Achieve • Succeed",

  backTitle: "LIBRARY ACCESS CREDENTIAL",
  noticeText:
    "SCAN THE BARCODE TO VERIFY THE STUDENT'S CURRENT LIBRARY MEMBERSHIP",
  librarianLabel: "AUTHORIZED LIBRARIAN",
  backFooterText:
    "If found, please return this card to SNCBT Library. This card is non-transferable.",

  showValidityTable: false,
  validityTitle: "SEMESTER MEMBERSHIP VALIDITY",
};

function preset(
  data: Omit<LibraryCardPreset, "design"> & {
    design: Partial<LibraryCardDesign>;
  },
): LibraryCardPreset {
  return {
    ...data,
    design: {
      ...DEFAULT_LIBRARY_CARD_DESIGN,
      ...data.design,
      designName: data.name,
    },
  };
}

export const LIBRARY_CARD_PRESETS: LibraryCardPreset[] = [
  preset({
    key: "campus-cinematic",
    category: "Institutional",
    name: "SNCBT Campus Cinematic",
    description:
      "Full-bleed Mel-Vi Building background with a strong navy institutional overlay.",
    icon: "i-lucide-building-2",
    design: {
      frontLayout: "cinematic",
      backStyle: "navy",
      backLayout: "credential",
      backgroundMode: "image",
      backgroundImage: "/library-card/sncbt-building.jpg",
      backgroundPosition: "center 45%",
      primaryColor: "#0B1F3A",
      secondaryColor: "#173A63",
      accentColor: "#38BDF8",
      overlayOpacity: 78,
      photoShape: "rounded",
    },
  }),

  preset({
    key: "campus-glass",
    category: "Institutional",
    name: "SNCBT Campus Glass",
    description:
      "Modern glass-panel identity card using the institution building as the main visual.",
    icon: "i-lucide-panels-top-left",
    design: {
      frontLayout: "glass",
      backStyle: "gradient",

      // Better layout for complete Student information
      backLayout: "credential",

      backgroundMode: "image",
      backgroundImage: "/library-card/sncbt-building.jpg",
      backgroundPosition: "50% 40%",

      primaryColor: "#071A33",
      secondaryColor: "#164E63",
      accentColor: "#67E8F9",
      overlayOpacity: 68,
      cornerRadius: 26,
      photoShape: "circle",

      showBackStudentDetails: true,
      showYearSection: true,
      showEmail: true,
      showAddress: true,
    },
  }),

  preset({
    key: "campus-split",
    category: "Institutional",
    name: "SNCBT Campus Split",
    description:
      "A clean split composition that keeps student information highly readable.",
    icon: "i-lucide-columns-2",
    design: {
      frontLayout: "split",
      backStyle: "light",
      backLayout: "credential",
      backgroundMode: "image",
      backgroundImage: "/library-card/sncbt-building.jpg",
      backgroundPosition: "58% center",
      primaryColor: "#0A2540",
      secondaryColor: "#1D4E89",
      accentColor: "#0EA5E9",
      surfaceColor: "#FFFFFF",
      textColor: "#FFFFFF",
      mutedTextColor: "#DCE8F5",
      overlayOpacity: 88,
      photoShape: "square",
    },
  }),

  preset({
    key: "navy-aurora",
    category: "Modern",
    name: "Navy Aurora",
    description:
      "A modern diagonal navy and cyan gradient for a digital-first identity.",
    icon: "i-lucide-sparkles",
    design: {
      frontLayout: "modern",
      backStyle: "gradient",
      backLayout: "credential",

      backgroundMode: "gradient",
      primaryColor: "#071A33",
      secondaryColor: "#1E3A8A",
      accentColor: "#60A5FA",
      overlayOpacity: 72,
      cornerRadius: 24,
      photoShape: "circle",

      showBackStudentDetails: true,
      showYearSection: true,
      showEmail: true,
      showAddress: true,
    },
  }),

  preset({
    key: "executive-midnight",
    category: "Modern",
    name: "Executive Midnight",
    description:
      "A formal solid-navy card with a portrait-led layout and restrained accents.",
    icon: "i-lucide-badge",
    design: {
      frontLayout: "portrait",
      backStyle: "navy",
      backLayout: "credential",
      backgroundMode: "solid",
      backgroundImage: "",
      primaryColor: "#06162B",
      secondaryColor: "#132F4C",
      accentColor: "#94A3B8",
      overlayOpacity: 100,
      cornerRadius: 18,
      photoShape: "rounded",
    },
  }),

  preset({
    key: "ocean-glass",
    category: "Modern",
    name: "Ocean Glass",
    description:
      "A polished cyan-to-navy glass layout with a bright, approachable appearance.",
    icon: "i-lucide-waves",
    design: {
      frontLayout: "glass",
      backStyle: "gradient",
      backLayout: "credential",

      backgroundMode: "gradient",
      primaryColor: "#082F49",
      secondaryColor: "#155E75",
      accentColor: "#67E8F9",
      overlayOpacity: 68,
      cornerRadius: 26,
      photoShape: "circle",

      showBackStudentDetails: true,
      showYearSection: true,
      showEmail: true,
      showAddress: true,
    },
  }),

  preset({
    key: "minimal-academic",
    category: "Minimal",
    name: "Minimal Academic",
    description:
      "White academic styling with navy typography and a clean institutional structure.",
    icon: "i-lucide-layout-template",
    design: {
      frontLayout: "minimal",
      backStyle: "light",
      backLayout: "minimal",
      backgroundMode: "solid",
      backgroundImage: "",
      primaryColor: "#0F2747",
      secondaryColor: "#E8EEF6",
      accentColor: "#2563EB",
      surfaceColor: "#FFFFFF",
      textColor: "#0F172A",
      mutedTextColor: "#475569",
      overlayOpacity: 0,
      cornerRadius: 16,
      photoShape: "square",
    },
  }),

  preset({
    key: "clean-credential",
    category: "Minimal",
    name: "Clean Credential",
    description:
      "Compact credential-focused layout with a clear barcode and cardholder information.",
    icon: "i-lucide-credit-card",
    design: {
      frontLayout: "split",
      backStyle: "light",
      backLayout: "credential",
      backgroundMode: "solid",
      backgroundImage: "",
      primaryColor: "#102A43",
      secondaryColor: "#D9E2EC",
      accentColor: "#3B82F6",
      surfaceColor: "#FFFFFF",
      textColor: "#FFFFFF",
      mutedTextColor: "#D9E2EC",
      overlayOpacity: 100,
      cornerRadius: 12,
      photoShape: "square",
      showAddress: false,
    },
  }),

  preset({
    key: "geometric-navy",
    category: "Creative",
    name: "Geometric Navy",
    description:
      "Dynamic geometric styling that remains professional and easy to print.",
    icon: "i-lucide-shapes",
    design: {
      frontLayout: "classic",
      backStyle: "solid",
      backLayout: "credential",

      backgroundMode: "solid",
      primaryColor: "#0A1733",
      secondaryColor: "#1D4ED8",
      accentColor: "#93C5FD",
      overlayOpacity: 100,
      cornerRadius: 22,
      photoShape: "circle",

      showBackStudentDetails: true,
      showYearSection: true,
      showEmail: true,
      showAddress: true,
    },
  }),

  preset({
    key: "electric-campus",
    category: "Creative",
    name: "Electric Campus",
    description:
      "A vibrant building-based card with an energetic blue accent and portrait composition.",
    icon: "i-lucide-zap",
    design: {
      frontLayout: "portrait",
      backStyle: "gradient",
      backLayout: "credential",
      backgroundMode: "image",
      backgroundImage: "/library-card/sncbt-building.jpg",
      backgroundPosition: "center 50%",
      primaryColor: "#0A1931",
      secondaryColor: "#185ADB",
      accentColor: "#FFC947",
      overlayOpacity: 74,
      cornerRadius: 24,
      photoShape: "circle",
    },
  }),
];

export const LIBRARY_CARD_PRESET_CATEGORIES:
  Array<"All" | LibraryCardPresetCategory> = [
    "All",
    "Institutional",
    "Modern",
    "Minimal",
    "Creative",
  ];

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

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

export function normalizeLibraryCardDesign(
  input?: Partial<LibraryCardDesign> | null,
): LibraryCardDesign {
  const value = input ?? {};
  const legacy =
    value as Partial<LibraryCardDesign> & {
      validityTitle?: string;
      showValidityTable?: boolean;
    };

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

    frontLayout: enumValue(
      value.frontLayout,
      [
        "cinematic",
        "split",
        "minimal",
        "glass",
        "diagonal",
        "portrait",
      ] as const,
      DEFAULT_LIBRARY_CARD_DESIGN.frontLayout,
    ),

    backStyle: enumValue(
      value.backStyle,
      ["navy", "light", "gradient"] as const,
      DEFAULT_LIBRARY_CARD_DESIGN.backStyle,
    ),

    backLayout: enumValue(
      value.backLayout,
      ["credential", "profile", "minimal"] as const,
      DEFAULT_LIBRARY_CARD_DESIGN.backLayout,
    ),

    backgroundMode: enumValue(
      value.backgroundMode,
      ["image", "gradient", "solid"] as const,
      DEFAULT_LIBRARY_CARD_DESIGN.backgroundMode,
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
      85,
      120,
      DEFAULT_LIBRARY_CARD_DESIGN.fontScale,
    ),

    photoShape: enumValue(
      value.photoShape,
      ["rounded", "square", "circle"] as const,
      DEFAULT_LIBRARY_CARD_DESIGN.photoShape,
    ),

    photoBorderColor: stringValue(
      value.photoBorderColor,
      DEFAULT_LIBRARY_CARD_DESIGN.photoBorderColor,
    ),
    logoUrl: stringValue(value.logoUrl, DEFAULT_LIBRARY_CARD_DESIGN.logoUrl),

    // Older saved designs only have logoUrl. Use that value on the
    // back until a dedicated Library logo is selected.
    backLogoUrl: stringValue(
      value.backLogoUrl,
      stringValue(value.logoUrl, DEFAULT_LIBRARY_CARD_DESIGN.backLogoUrl),
    ),
    backLogoSize: clamp(
      value.backLogoSize,
      32,
      84,
      DEFAULT_LIBRARY_CARD_DESIGN.backLogoSize,
    ),

    showLogo: booleanValue(
      value.showLogo,
      DEFAULT_LIBRARY_CARD_DESIGN.showLogo,
    ),
    showBackLogo: booleanValue(
      value.showBackLogo,
      booleanValue(value.showLogo, DEFAULT_LIBRARY_CARD_DESIGN.showBackLogo),
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
    showBarcode: booleanValue(
      value.showBarcode,
      DEFAULT_LIBRARY_CARD_DESIGN.showBarcode,
    ),

    showBackStudentDetails: booleanValue(
      value.showBackStudentDetails,
      DEFAULT_LIBRARY_CARD_DESIGN.showBackStudentDetails,
    ),
    showYearSection: booleanValue(
      value.showYearSection,
      DEFAULT_LIBRARY_CARD_DESIGN.showYearSection,
    ),
    showEmail: booleanValue(
      value.showEmail,
      DEFAULT_LIBRARY_CARD_DESIGN.showEmail,
    ),
    showAddress: booleanValue(
      value.showAddress,
      DEFAULT_LIBRARY_CARD_DESIGN.showAddress,
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

    backTitle: stringValue(
      value.backTitle,
      stringValue(legacy.validityTitle, DEFAULT_LIBRARY_CARD_DESIGN.backTitle),
    ),
    noticeText: stringValue(
      value.noticeText,
      DEFAULT_LIBRARY_CARD_DESIGN.noticeText,
    ),
    librarianLabel: stringValue(
      value.librarianLabel,
      DEFAULT_LIBRARY_CARD_DESIGN.librarianLabel,
    ),
    backFooterText: stringValue(
      value.backFooterText,
      DEFAULT_LIBRARY_CARD_DESIGN.backFooterText,
    ),

    // Always disabled in the redesigned permanent card.
    showValidityTable: false,
    validityTitle: stringValue(
      legacy.validityTitle,
      DEFAULT_LIBRARY_CARD_DESIGN.validityTitle ?? "",
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
