// Chromium smoke against the production Vite preview.
// CI builds first; locally the webServer builds if dist/ is stale.

import { defineConfig } from "@playwright/test";

const PORT = 4173;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: process.env.CI
      ? `npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`
      : `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
