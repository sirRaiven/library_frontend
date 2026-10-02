const isProduction = process.env.NODE_ENV === "production";

function normalizeStrapiBaseUrl(value: unknown): string {
  const raw = String(value ?? "").trim().replace(/\/+$/, "");

  // Every frontend API path already begins with /api. A non-empty relative
  // base such as /api would silently produce /api/api/... across the system.
  // Use an empty value for same-origin reverse-proxy deployments instead.
  if (!raw) return "";
  if (raw.startsWith("/")) {
    throw new Error(
      "NUXT_PUBLIC_STRAPI_URL must be empty for same-origin deployment or an absolute origin such as https://api.example.edu. Do not set it to /api.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      "NUXT_PUBLIC_STRAPI_URL must be empty or an absolute http(s) origin.",
    );
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("NUXT_PUBLIC_STRAPI_URL must use http: or https:.");
  }

  if (
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      "NUXT_PUBLIC_STRAPI_URL must contain only the API origin (for example https://api.example.edu), with no /api path, query, fragment, or credentials.",
    );
  }

  // Do not fail Nuxt config loading for an HTTP origin. Nuxt evaluates this
  // file during npm install/postinstall (`nuxt prepare`), IDE tooling,
  // typechecking, development and production builds. Treating NODE_ENV as a
  // deployment signal here can therefore break a perfectly valid local
  // install that talks to http://localhost:1337. Production HTTPS is enforced
  // separately by `npm run verify:production-env`.
  if (isProduction && parsed.protocol !== "https:") {
    console.warn(
      "[SNCBT security] NUXT_PUBLIC_STRAPI_URL is HTTP while NODE_ENV=production. " +
        "This is allowed for install/build tooling, but run `npm run verify:production-env` before deployment.",
    );
  }

  return parsed.origin;
}

const configuredStrapiUrl = normalizeStrapiBaseUrl(
  process.env.NUXT_PUBLIC_STRAPI_URL ??
    (isProduction ? "" : "http://localhost:1337"),
);
const optionalStrapiSource = configuredStrapiUrl
  ? ` ${configuredStrapiUrl}`
  : "";

// Production permits WebAssembly compilation for the self-hosted barcode detector,
// but deliberately omits general unsafe-eval. Development keeps Vite HMR/eval support.
const scriptSources = isProduction
  ? "'self' 'unsafe-inline' 'wasm-unsafe-eval'"
  : "'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:";

const connectSources = isProduction
  ? `'self'${optionalStrapiSource} https: wss:`
  : `'self'${optionalStrapiSource} http: https: ws: wss:`;

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src ${scriptSources}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src 'self' data: blob:${optionalStrapiSource}`,
  `media-src 'self' data: blob:${optionalStrapiSource}`,
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

  // Explicit compatibility mode: do not require cross-origin isolation because
  // it can break browser/media dependencies that are not CORP/COEP-ready.
  "Cross-Origin-Embedder-Policy": "unsafe-none",
};

if (isProduction) {
  const includeSubdomains = process.env.HSTS_INCLUDE_SUBDOMAINS === "true";
  const preload = includeSubdomains && process.env.HSTS_PRELOAD === "true";
  const hsts = ["max-age=31536000"];

  if (includeSubdomains) hsts.push("includeSubDomains");
  if (preload) hsts.push("preload");

  securityHeaders["Strict-Transport-Security"] = hsts.join("; ");
}

export default defineNuxtConfig({
  compatibilityDate: "2027-08-05",
  ssr: true,

  devtools: {
    enabled: !isProduction,
  },

  modules: ["@nuxt/ui"],

  // Nuxt UI integrates @nuxt/fonts automatically. Keep Inter as an optional
  // locally-installed face instead of proxying/downloading it through /_fonts.
  // This avoids Firefox dev-server font transport failures while retaining the
  // existing system-ui fallback stack on machines without Inter installed.
  fonts: {
    families: [{ name: "Inter", provider: "none" }],
  },

  ui: {
    content: true,
  },

  css: ["~/assets/css/main.css"],

  nitro: {
    compressPublicAssets: true,
  },

  routeRules: {
    "/**": {
      headers: securityHeaders,
    },

    // Authenticated portal pages depend on client-restored JWT/user state.
    // Rendering them on the server from only the privacy-safe session hint can
    // produce different markup than the hydrated client. Keep public entry
    // pages SSR-capable, but render all private portal shells on the client.
    "/admin": { ssr: false, headers: securityHeaders },
    "/admin/**": { ssr: false, headers: securityHeaders },
    "/librarian": { ssr: false, headers: securityHeaders },
    "/librarian/**": { ssr: false, headers: securityHeaders },
    "/student": { ssr: false, headers: securityHeaders },
    "/student/**": { ssr: false, headers: securityHeaders },
    "/faculty": { ssr: false, headers: securityHeaders },
    "/faculty/**": { ssr: false, headers: securityHeaders },
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
      // Same-origin production deployment is the safest default. Nuxt's
      // NUXT_PUBLIC_STRAPI_URL environment variable overrides this at runtime.
      strapiUrl: configuredStrapiUrl,
    },
  },
});
