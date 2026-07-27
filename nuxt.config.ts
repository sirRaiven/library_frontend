export default defineNuxtConfig({
  ssr: true,

  devtools: {
    enabled: process.env.NODE_ENV !== "production",
  },

  modules: ["@nuxt/ui"],

  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      strapiUrl: "",
    },
  },
});
