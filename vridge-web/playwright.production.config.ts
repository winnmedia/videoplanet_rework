import { defineConfig, devices } from '@playwright/test';

/**
 * 🌟 Playwright 운영 환경 설정
 * 운영 배포 후 최종 검증 및 스모크 테스트를 실행합니다.
 */
export default defineConfig({
  testDir: './tests/production',
  
  // 운영 환경 보수적 설정
  fullyParallel: false, // 운영에서는 순차 실행으로 안정성 확보
  forbidOnly: true,
  retries: 3, // 네트워크 이슈 대비 재시도 증가
  workers: 1, // 운영 서버 부하 최소화
  
  // 상세 리포터 설정
  reporter: [
    ['html', { outputFolder: 'playwright-report-production' }],
    ['json', { outputFile: 'test-results-production.json' }],
    ['junit', { outputFile: 'test-results-production.xml' }],
    ['github']
  ],
  
  // 운영 환경 설정
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://vridge.vlanet.net',
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // 운영 환경 헤더
    extraHTTPHeaders: {
      'X-Test-Environment': 'production',
      'User-Agent': 'VRidge-Production-Monitor/1.0'
    },
    
    // 운영 환경 성능 고려 설정
    navigationTimeout: 60000,
    actionTimeout: 30000
  },

  // 운영 환경 프로젝트
  projects: [
    // 핵심 스모크 테스트 (필수)
    {
      name: 'production-smoke',
      testMatch: '**/*.smoke.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // 운영에서는 헤드리스로만 실행
        headless: true
      },
      timeout: 60000,
    },

    // 중요 사용자 여정 테스트
    {
      name: 'production-critical-path',
      testMatch: '**/critical-path.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true
      },
      timeout: 120000,
    },

    // API 엔드포인트 테스트
    {
      name: 'production-api',
      testMatch: '**/api-only.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true
      },
      timeout: 30000,
    },

    // 모바일 핵심 테스트 (선택적)
    {
      name: 'production-mobile-critical',
      testMatch: '**/mobile-critical.spec.ts',
      use: { 
        ...devices['Pixel 5'],
        headless: true
      },
      timeout: 90000,
    },
  ],

  // 운영 환경 글로벌 설정
  globalSetup: require.resolve('./tests/production/global-setup.ts'),
  globalTeardown: require.resolve('./tests/production/global-teardown.ts'),
  
  // 웹 서버는 이미 실행 중이므로 불필요
  webServer: undefined,
  
  // 운영 환경 전용 설정
  expect: {
    // 운영에서는 더 엄격한 타임아웃
    timeout: 10000,
  },
  
  // 테스트 실패 시 더 많은 정보 수집
  metadata: {
    environment: 'production',
    version: process.env.VERSION || 'unknown',
    timestamp: new Date().toISOString(),
  }
});