/**
 * SNCBT Library Design System v2 — Wave DS-4
 *
 * Structural values shared by responsive checks and shared application shells.
 * Visual values remain CSS custom properties in assets/css/main.css so Nuxt UI,
 * Tailwind utilities, light mode and dark mode all resolve one source of truth.
 */
export const SNCBT_DESIGN_SYSTEM_VERSION = "2.0-ds4" as const;

export const SNCBT_BREAKPOINTS = {
  mobileMin: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  wide: 1536,
} as const;

export const SNCBT_LAYOUT = {
  contentMaxRem: 94,
  readableMaxRem: 72,
  minimumSupportedViewportPx: 320,
  touchTargetPx: 44,
} as const;

export const SNCBT_SHELL = {
  desktopNavigationBreakpointPx: SNCBT_BREAKPOINTS.lg,
  mobileDrawerMaxRem: 21,
  mobileBottomNavigationRoles: ["student", "faculty"] as const,
  staffDrawerRoles: ["administrator", "librarian"] as const,
  mobilePrimaryDestinationLimit: 4,
} as const;


export const SNCBT_INTERACTION = {
  mobileDataViewBreakpointPx: SNCBT_BREAKPOINTS.md,
  mobileFilterCollapseBreakpointPx: SNCBT_BREAKPOINTS.md,
  stickyActionBreakpointPx: SNCBT_BREAKPOINTS.md,
  mobilePrimaryActionLimit: 1,
  minimumTouchTargetPx: SNCBT_LAYOUT.touchTargetPx,
  defaultLoadingRows: 4,
} as const;

export const SNCBT_STAFF_PAGES = {
  responsiveRecordBreakpointPx: SNCBT_BREAKPOINTS.md,
  compactHeaderActionsBelowPx: SNCBT_BREAKPOINTS.md,
  minimumOperationalCardGapPx: 10,
  protectedPortals: ["admin", "librarian"] as const,
  expectedAdminPages: 23,
  expectedLibrarianPages: 26,
} as const;

export const SNCBT_DENSITY = {
  compact: "compact",
  comfortable: "comfortable",
} as const;

export type SncbtDensity = (typeof SNCBT_DENSITY)[keyof typeof SNCBT_DENSITY];
export type SncbtMobileBottomNavigationRole =
  (typeof SNCBT_SHELL.mobileBottomNavigationRoles)[number];
