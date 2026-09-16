export default defineNuxtRouteMiddleware(async (to) => {
  const isPublicRoute =
    to.meta.public === true ||
    to.path === "/" ||
    to.path === "/student-registration";

  if (import.meta.server) {
    if (to.path === "/faculty-access") {
      return navigateTo("/faculty/dashboard", { replace: true });
    }

    if (isPublicRoute) return;

    const sessionHint = useCookie<string | null>("auth-session-hint");

    if (!sessionHint.value) {
      return navigateTo({
        path: "/",
        query: { redirect: to.fullPath },
      });
    }

    return;
  }

  const nuxtApp = useNuxtApp();

  if (
    nuxtApp.isHydrating &&
    nuxtApp.payload.serverRendered
  ) {
    return;
  }

  const auth = useAuth();

  if (!auth.initialized.value) {
    await auth.initialize();
  }

  if (isPublicRoute) {
    if (to.path === "/" && auth.isAuthenticated.value) {
      return navigateTo(auth.homeRoute.value);
    }

    return;
  }

  if (!auth.isAuthenticated.value) {
    return navigateTo({
      path: "/",
      query: {
        redirect: to.fullPath,
      },
    });
  }

  const role = auth.role.value;

  if (
    to.path.startsWith("/admin") &&
    !auth.isAdministrator.value
  ) {
    return navigateTo(auth.homeRoute.value);
  }

  if (
    to.path.startsWith("/librarian") &&
    role !== "librarian"
  ) {
    return navigateTo(auth.homeRoute.value);
  }

  if (
    to.path.startsWith("/student/") &&
    role !== "student"
  ) {
    return navigateTo(auth.homeRoute.value);
  }

  if (
    to.path.startsWith("/faculty") &&
    role !== "faculty"
  ) {
    return navigateTo(auth.homeRoute.value);
  }
});
