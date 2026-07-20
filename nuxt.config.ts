export default defineNuxtConfig({
  ssr: true,

  devtools: {
    enabled: true,
  },

  modules: ["@nuxt/ui"],

  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      strapiUrl: "",
    },
  },
});
