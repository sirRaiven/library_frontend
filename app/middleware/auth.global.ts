export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return;
  }

  const auth = useAuth();

  if (!auth.initialized.value) {
    await auth.initialize();
  }

  if (to.path === "/") {
    if (auth.isAuthenticated.value) {
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

  if (to.path.startsWith("/librarian") && role !== "librarian") {
    return navigateTo(auth.homeRoute.value);
  }

  if (to.path.startsWith("/student") && role !== "student") {
    return navigateTo(auth.homeRoute.value);
  }

  if (to.path.startsWith("/faculty") && role !== "faculty") {
    return navigateTo(auth.homeRoute.value);
  }
});
