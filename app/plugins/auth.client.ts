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

    if (
      path.startsWith("/admin") &&
      !auth.isAdministrator.value
    ) {
      await navigateTo(auth.homeRoute.value, { replace: true });
    }
  });
});
