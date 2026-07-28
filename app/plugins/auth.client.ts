export default defineNuxtPlugin((nuxtApp) => {
  const auth = useAuth();
  const router = useRouter();

  nuxtApp.hook("app:mounted", async () => {
    await auth.initialize();

    const currentRoute = router.currentRoute.value;
    const path = currentRoute.path;

    if (path === "/" && auth.isAuthenticated.value) {
      await navigateTo(auth.homeRoute.value, { replace: true });
      return;
    }

    if (path !== "/" && !auth.isAuthenticated.value) {
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
