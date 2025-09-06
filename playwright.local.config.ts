/**
 * Playwright Local Development Configuration
 * UI 품질 감사를 위한 로컬 개발 환경 설정
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // UI 감사는 순차 실행으로 안정성 확보
  forbidOnly: false, // 개발 중이므로 .only() 허용
  retries: 1, // 로컬 환경이므로 재시도 최소화
  workers: 1, // UI 품질 감사는 단일 워커로 실행
  timeout: 30000, // 30초
  reporter: [
    ['html', { outputFolder: 'test-results/ui-audit-report', open: 'never' }],
    ['json', { outputFile: 'test-results/ui-audit-results.json' }],
    ['list'],
  ],
  use: {
    // 로컬 개발 서버 URL
    baseURL: 'http://localhost:3003',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000, // 10초
    navigationTimeout: 15000, // 15초
    headless: false, // 개발 중이므로 브라우저 표시
    launchOptions: {
      // 디버깅을 위한 느린 실행
      slowMo: 500, // 500ms 딜레이
    }
  },

  projects: [
    {
      name: 'ui-quality-audit',
      testMatch: ['**/ui-quality-audit.spec.ts'],
      use: { 
        ...devices['Desktop Chrome'],
        headless: false, // UI 확인을 위해 브라우저 표시
      },
      timeout: 60000, // UI 테스트는 더 긴 시간 허용
    },
    {
      name: 'navigation-ux-audit',
      testMatch: ['**/navigation-ux-audit.spec.ts'],
      use: { 
        ...devices['Desktop Chrome'],
        headless: false, // UX 확인을 위해 브라우저 표시
      },
      timeout: 60000, // UX 테스트는 더 긴 시간 허용
    },
    {
      name: 'http-error-audit',
      testMatch: ['**/http-error-audit.spec.ts'],
      use: { 
        ...devices['Desktop Chrome'],
        headless: true, // HTTP 테스트는 헤드리스로 빠르게
      },
      timeout: 45000,
    },
  ],

  // 로컬 개발 서버는 이미 실행 중이므로 웹서버 설정 불필요
  webServer: undefined,
});