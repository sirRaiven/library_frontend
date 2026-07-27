export default defineNuxtConfig({
  ssr: true,

  devtools: {
    enabled: process.env.NODE_ENV !== "production",
  },

  modules: ["@nuxt/ui"],

  css: ["~/assets/css/main.css"],

  app: {
    head: {
      title: "SNCBT Library Management System",
      titleTemplate: "%s | SNCBT Library Management System",
      htmlAttrs: {
        lang: "en",
      },
      meta: [
        {
          name: "application-name",
          content: "SNCBT Library Management System",
        },
        {
          name: "theme-color",
          content: "#059669",
        },
      ],
      link: [
        {
          rel: "icon",
          type: "image/png",
          href: "/sncbt-library-logo.png",
        },
        {
          rel: "shortcut icon",
          type: "image/png",
          href: "/sncbt-library-logo.png",
        },
        {
          rel: "apple-touch-icon",
          href: "/sncbt-library-logo.png",
        },
      ],
    },
  },

  runtimeConfig: {
    public: {
      strapiUrl: "",
    },
  },
});
