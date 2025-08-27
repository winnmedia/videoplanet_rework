import { defineConfig, devices } from '@playwright/test';

/**
 * 🧪 Playwright 스테이징 환경 설정
 * 스테이징 배포 후 스모크 테스트 및 기본 E2E 테스트를 실행합니다.
 */
export default defineConfig({
  testDir: './tests/staging',
  
  // 스테이징 환경 전용 설정
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  
  // 리포터 설정
  reporter: [
    ['html', { outputFolder: 'playwright-report-staging' }],
    ['json', { outputFile: 'test-results-staging.json' }],
    ['github']
  ],
  
  // 스테이징 전용 설정
  use: {
    baseURL: 'https://staging.vridge.vlanet.net',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // 스테이징 환경 헤더
    extraHTTPHeaders: {
      'X-Test-Environment': 'staging'
    }
  },

  // 스테이징 전용 프로젝트
  projects: [
    // 스모크 테스트 (최소한의 핵심 기능 검증)
    {
      name: 'staging-smoke',
      testMatch: '**/*.smoke.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      timeout: 30000, // 빠른 실행을 위해 30초 제한
    },

    // 기본 브라우저 테스트
    {
      name: 'staging-chrome',
      testMatch: '**/*.spec.ts',
      testIgnore: '**/*.smoke.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // 모바일 테스트 (중요 기능만)
    {
      name: 'staging-mobile',
      testMatch: '**/critical-path.spec.ts',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // 스테이징 환경 글로벌 설정
  globalSetup: require.resolve('./tests/staging/global-setup.ts'),
  globalTeardown: require.resolve('./tests/staging/global-teardown.ts'),
  
  // 테스트 실행 전 웹 서버 대기
  webServer: undefined, // 이미 배포된 스테이징 서버 사용
});