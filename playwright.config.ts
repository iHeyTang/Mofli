import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test",
  testMatch: "**/*.spec.ts",
  use: {
    browserName: "chromium",
    channel: process.env.MOFLI_BROWSER_CHANNEL,
    viewport: { width: 1360, height: 900 },
  },
  webServer: {
    command: "npm run dev -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});
