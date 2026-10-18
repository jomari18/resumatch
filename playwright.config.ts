import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      AI_PROVIDER: "fake",
      FAKE_AI_MODE: "ok",
      STORE: "memory",
      ALLOW_TEST_ADAPTERS: "1",
      IP_HASH_SALT: "e2e-ip-salt-e2e-ip-salt-e2e-ip-salt",
      RESULT_SIGNING_SECRET: "e2e-signing-secret-e2e-signing-secret",
      PER_IP_DAILY_LIMIT: "10",
      GLOBAL_DAILY_LIMIT: "1000",
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
});
