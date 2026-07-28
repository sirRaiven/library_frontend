export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const nuxtApp = useNuxtApp();

  if (nuxtApp.isHydrating && nuxtApp.payload.serverRendered) {
    return;
  }

  const auth = useAuth();

  if (!auth.initialized.value) {
    await auth.initialize();
  }

  if (!auth.isAuthenticated.value) {
    return navigateTo({
      path: "/",
      query: { redirect: to.fullPath },
    });
  }

  if (!auth.isStudent.value) {
    return navigateTo(auth.homeRoute.value);
  }
});
