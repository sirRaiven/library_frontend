const isProduction = process.env.NODE_ENV === "production";

const strapiUrl = (
  process.env.NUXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
).replace(/\/+$/, "");

// Development needs Vite HMR/eval support. Production deliberately omits unsafe-eval.
const scriptSources = isProduction
  ? "'self' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'unsafe-eval' blob:";

const connectSources = isProduction
  ? `'self' ${strapiUrl} https: wss:`
  : `'self' ${strapiUrl} http: https: ws: wss:`;

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src ${scriptSources}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src 'self' data: blob: ${strapiUrl}`,
  `media-src 'self' data: blob: ${strapiUrl}`,
  `connect-src ${connectSources}`,
  "worker-src 'self' blob:",
  "frame-src 'self' blob:",
].join("; ");

const securityHeaders: Record<string, string> = {
  "Content-Security-Policy": contentSecurityPolicy,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",

  // Explicitly present without enabling cross-origin isolation yet.
  // require-corp can break Strapi-hosted images/media when frontend and API
  // are on separate origins, so harden this later only after dedicated testing.
  "Cross-Origin-Embedder-Policy": "unsafe-none",
};

if (isProduction) {
  securityHeaders["Strict-Transport-Security"] =
    "max-age=31536000; includeSubDomains";
}

export default defineNuxtConfig({
  compatibilityDate: "2026-08-05",
  ssr: true,

  devtools: {
    enabled: !isProduction,
  },

  modules: ["@nuxt/ui", "@nuxt/content"],

  content: {
    experimental: {
      sqliteConnector: "native",
    },
  },

  css: ["~/assets/css/main.css"],

  nitro: {
    compressPublicAssets: true,
  },

  routeRules: {
    "/**": {
      headers: securityHeaders,
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
