import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/dashboard-visual-test.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60000,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'https://vridge-xyc331ybx-vlanets-projects.vercel.app',
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure', 
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    headless: true,
    ignoreHTTPSErrors: false,
  },

  projects: [
    {
      name: 'dashboard-visual-test',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
  ],

  // 전역 설정 비활성화
  webServer: undefined,
  globalSetup: undefined,
  globalTeardown: undefined,
});