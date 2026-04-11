const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: {
    timeout: 8_000
  },
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: process.env.COSMO_CHECK_BASE_URL || "http://127.0.0.1:3310",
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "cmd /c npx vercel dev --listen 3310 --yes",
    cwd: __dirname,
    url: process.env.COSMO_CHECK_BASE_URL || "http://127.0.0.1:3310",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ]
});
