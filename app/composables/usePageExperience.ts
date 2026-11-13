/** Shared page-loading state. Only represents Nuxt route/Suspense loading, not API mutations. */
export function usePageExperience() {
  const isNavigating = useState<boolean>("sncbt-page-navigation-pending", () => false);
  return { isNavigating };
}
