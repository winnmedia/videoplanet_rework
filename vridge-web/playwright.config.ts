import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // 배포 환경에서는 순차 실행으로 안정성 확보
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1, // 배포 환경에서는 재시도 증가
  workers: process.env.CI ? 1 : 2, // 배포 환경에서는 단일 워커로 안정성 확보
  timeout: 60000, // 60초 - 배포 환경은 느릴 수 있음
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }], // CI/CD용 JUnit 포맷
    ['list'],
    ['github'], // GitHub Actions용 어노테이션
  ],
  use: {
    // 배포 환경 URL 사용
    baseURL: 'https://vridge-xyc331ybx-vlanets-projects.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure', 
    video: 'retain-on-failure',
    actionTimeout: 15000, // 15초 - 배포 환경에 맞춤
    navigationTimeout: 30000, // 30초
    headless: true,
    // 배포 환경에서의 안정성을 위한 추가 설정
    ignoreHTTPSErrors: false,
    acceptDownloads: false,
    // 사용자 에이전트를 실제 브라우저와 유사하게 설정
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 PlaywrightE2E',
  },

  projects: [
    {
      name: 'api-smoke-tests',
      testMatch: ['**/smoke-test-api-only.spec.ts'],
      use: { 
        // API-only tests don't need browser instances
        browserName: undefined,
      },
      timeout: 20000, // API 테스트는 빠름
    },
    {
      name: 'production-smoke-tests',
      testMatch: ['**/smoke-test-production.spec.ts'],
      use: { 
        ...devices['Desktop Chrome'],
        headless: true,
      },
      timeout: 30000, // Smoke test는 빠르게
    },
    {
      name: 'api-tests',
      testMatch: ['**/api-only.spec.ts'],
      use: { 
        // API tests don't need browser instances
        browserName: undefined,
      },
      timeout: 20000, // API 테스트는 상대적으로 빠름
    },
    {
      name: 'critical-path',
      testMatch: ['**/critical-path.spec.ts'],
      use: { 
        ...devices['Desktop Chrome'],
        headless: true,
        // Critical path는 더 긴 타임아웃 허용
        actionTimeout: 20000,
        navigationTimeout: 45000,
      },
      timeout: 90000, // Critical path는 더 긴 시간 허용
    },
    {
      name: 'user-journey',
      testMatch: ['**/user-journey-production.spec.ts'],
      use: { 
        ...devices['Desktop Chrome'],
        headless: true,
      },
      timeout: 120000, // 사용자 여정은 가장 긴 시간 허용
    },
    {
      name: 'existing-tests',
      testMatch: ['**/user-journey.spec.ts'],
      use: { 
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
    // 모바일 테스트 프로젝트 추가
    {
      name: 'mobile-critical',
      testMatch: ['**/smoke-test-production.spec.ts', '**/critical-path.spec.ts'],
      use: {
        ...devices['iPhone 13'],
        headless: true,
      },
      timeout: 60000,
    },
  ],

  // 배포 환경에서는 로컬 웹서버 불필요
  webServer: undefined,

  // 전역 설정
  globalSetup: require.resolve('./tests/e2e/helpers/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/helpers/global-teardown.ts'),
});