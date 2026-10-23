import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests. Build first (`pnpm build`); the server is started with `pnpm start`.
 * Specs that need a live Supabase (local stack seeded with supabase/seed.sql) are skipped
 * unless E2E_SUPABASE=1 and the app env points at that stack.
 * Chromium resolves *.localhost to loopback, so portal.localhost needs no hosts-file entry.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
