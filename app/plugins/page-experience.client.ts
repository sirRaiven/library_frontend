/** Keep route skeletons aligned with actual Nuxt page resolution (no fake timeouts). */
export default defineNuxtPlugin((nuxtApp) => {
  const { isNavigating } = usePageExperience();
  const router = useRouter();

  nuxtApp.hook("page:loading:start", () => {
    isNavigating.value = true;
  });
  nuxtApp.hook("page:loading:end", () => {
    isNavigating.value = false;
  });
  nuxtApp.hook("app:error", () => {
    isNavigating.value = false;
  });
  router.onError(() => {
    isNavigating.value = false;
  });
  router.afterEach((_to, _from, failure) => {
    if (failure) isNavigating.value = false;
  });
});
