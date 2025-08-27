import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.CI ? 'https://vridge-web.vercel.app' : 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    headless: true, // Force headless mode to avoid browser dependency issues
  },

  projects: [
    {
      name: 'api-tests',
      testMatch: '**/smoke-test.spec.ts',
      use: { 
        // API tests don't need browser instances
        browserName: undefined,
      },
    },
    {
      name: 'chromium',
      testIgnore: '**/smoke-test.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
  ],

  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});