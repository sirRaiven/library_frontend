import { loadEnv } from "vite";

const loaded = loadEnv("test", process.cwd(), "");

export const testEnv = {
  ...loaded,
  ...process.env,
};

export const runLiveTests = String(testEnv.RUN_LIVE_TESTS ?? "").toLowerCase() === "true";
export const strapiUrl = String(testEnv.TEST_STRAPI_URL ?? "http://localhost:1337").replace(/\/+$/, "");
export const frontendOrigin = String(testEnv.TEST_FRONTEND_ORIGIN ?? "http://localhost:3000").replace(/\/+$/, "");

export interface RoleCredential {
  identifier: string;
  password: string;
}

export function roleCredential(prefix: string): RoleCredential | null {
  const identifier = String(testEnv[`TEST_${prefix}_IDENTIFIER`] ?? "").trim();
  const password = String(testEnv[`TEST_${prefix}_PASSWORD`] ?? "");
  return identifier && password ? { identifier, password } : null;
}
