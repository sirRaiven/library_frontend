import { defineVitestProject } from "@nuxt/test-utils/config";
import { defineConfig } from "vitest/config";

const WINDOWS = process.platform === "win32";
const BROWSER_SETUP_TIMEOUT = WINDOWS ? 240_000 : 180_000;
const BROWSER_HOOK_TIMEOUT = BROWSER_SETUP_TIMEOUT + 60_000;

interface BrowserProjectOptions {
  name: string;
  include: string[];
  groupOrder: number;
}

const browserProject = ({ name, include, groupOrder }: BrowserProjectOptions) => ({
  test: {
    name,
    include,
    environment: "node",
    testTimeout: 90_000,
    hookTimeout: BROWSER_HOOK_TIMEOUT,
    fileParallelism: false,
    maxWorkers: 1,
    sequence: {
      groupOrder,
    },
  },
});

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/unit/**/*.{test,spec}.ts"],
          environment: "node",
        },
      },
      await defineVitestProject({
        test: {
          name: "nuxt",
          include: ["test/nuxt/**/*.{test,spec}.ts"],
          environment: "nuxt",
          testTimeout: WINDOWS ? 60_000 : 30_000,
          hookTimeout: WINDOWS ? 60_000 : 30_000,
          fileParallelism: false,
          maxWorkers: 1,
          environmentOptions: {
            nuxt: {
              domEnvironment: "happy-dom",
            },
          },
        },
      }),
      browserProject({
        name: "e2e-chromium",
        // Chromium authentication, role isolation, routing, and UI smoke checks
        // are intentionally consolidated into one file so Nuxt is built/started once.
        include: ["test/e2e/chromium/app.e2e.test.ts"],
        groupOrder: 10,
      }),
      browserProject({
        name: "e2e-firefox",
        include: ["test/e2e/firefox/**/*.{test,spec}.ts"],
        groupOrder: 20,
      }),
      browserProject({
        name: "e2e-webkit",
        include: ["test/e2e/webkit/**/*.{test,spec}.ts"],
        groupOrder: 30,
      }),
      {
        test: {
          name: "live",
          include: ["test/live/**/*.{test,spec}.ts"],
          environment: "node",
          testTimeout: 30_000,
          hookTimeout: 30_000,
          fileParallelism: false,
        },
      },
      {
        test: {
          name: "acceptance",
          include: ["test/acceptance/**/*.acceptance.test.ts"],
          environment: "node",
          testTimeout: WINDOWS ? 180_000 : 120_000,
          hookTimeout: WINDOWS ? 180_000 : 120_000,
          fileParallelism: false,
          maxWorkers: 1,
          sequence: {
            groupOrder: 40,
          },
        },
      },
    ],
  },
});
