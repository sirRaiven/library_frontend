export default defineNuxtConfig({
  compatibilityDate: "2026-08-05",
  ssr: true,

  devtools: {
    enabled: process.env.NODE_ENV !== "production",
  },

  modules: ["@nuxt/ui"],

  css: ["~/assets/css/main.css"],

  nitro: {
    compressPublicAssets: true,
  },

  routeRules: {
    "/**": {
      headers: {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
      },
    },
  },

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
