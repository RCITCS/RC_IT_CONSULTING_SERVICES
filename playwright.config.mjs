import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /phase18-.*\.spec\.mjs/,
  timeout: 30_000,
  expect: { timeout: 7_500 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]] : 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  },
  projects: [
    { name: 'small-mobile-webkit-320', use: { ...devices['iPhone SE'], viewport: { width: 320, height: 568 } } },
    { name: 'mobile-chromium-390', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'tablet-webkit-768', use: { ...devices['iPad Mini'], viewport: { width: 768, height: 1024 } } },
    { name: 'laptop-chromium-1024', use: { browserName: 'chromium', viewport: { width: 1024, height: 768 } } },
    { name: 'desktop-chromium-1280', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
    { name: 'desktop-firefox-1280', use: { browserName: 'firefox', viewport: { width: 1280, height: 800 } } }
  ]
});
