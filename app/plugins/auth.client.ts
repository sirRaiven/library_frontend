export default defineNuxtPlugin((nuxtApp) => {
  const auth = useAuth();
  const router = useRouter();

  function isPublicRoute() {
    const currentRoute = router.currentRoute.value;

    return (
      currentRoute.meta.public === true ||
      currentRoute.path === "/" ||
      currentRoute.path === "/student-registration"
    );
  }

  function canAccessPortalPath(path: string): boolean {
    if (path.startsWith("/admin")) {
      return auth.isAdministrator.value;
    }

    if (path.startsWith("/librarian")) {
      return auth.isLibrarian.value;
    }

    if (path === "/student" || path.startsWith("/student/")) {
      return auth.isStudent.value;
    }

    if (path.startsWith("/faculty")) {
      return auth.isFaculty.value;
    }

    return true;
  }

  nuxtApp.hook("app:mounted", async () => {
    await auth.initialize();

    const currentRoute = router.currentRoute.value;
    const path = currentRoute.path;

    if (isPublicRoute()) {
      if (path === "/" && auth.isAuthenticated.value) {
        await navigateTo(auth.homeRoute.value, { replace: true });
      }
      return;
    }

    if (!auth.isAuthenticated.value) {
      await navigateTo(
        {
          path: "/",
          query: { redirect: currentRoute.fullPath },
        },
        { replace: true },
      );
      return;
    }

    // Global route middleware is intentionally skipped during SSR/hydration.
    // Re-apply all portal-role boundaries after the client restores the
    // authenticated session so a direct hard-load cannot leave the wrong
    // portal shell visible after refresh.
    if (!canAccessPortalPath(path)) {
      await navigateTo(auth.homeRoute.value, { replace: true });
    }
  });
});
