/**
 * Cypress E2E 테스트 설정
 * 품질 게이트 및 에러 처리 시나리오 테스트 특화
 */

import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    // 기본 설정
    baseUrl: 'http://localhost:3001',
    viewportWidth: 1280,
    viewportHeight: 720,

    // 테스트 실행 설정
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',

    // 비디오 및 스크린샷
    video: true,
    screenshotOnRunFailure: true,
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',

    // 시간 제한 설정
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,

    // 재시도 설정
    retries: {
      runMode: 2, // CI에서 2번 재시도
      openMode: 0, // 개발 중에는 재시도 없음
    },

    // 환경 변수
    env: {
      // 백엔드 API 설정
      API_BASE_URL: 'http://127.0.0.1:8001',

      // 테스트 사용자 설정 (개발용)
      TEST_USER_EMAIL: 'test@example.com',
      TEST_USER_PASSWORD: 'testPassword123!',

      // 에러 테스트 설정
      ENABLE_ERROR_SCENARIOS: true,
      ERROR_SIMULATION_DELAY: 1000,

      // 접근성 테스트 설정
      A11Y_OPTIONS: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
      },

      // 성능 테스트 임계값 (Performance Lead 2024 기준)
      PERFORMANCE_THRESHOLDS: {
        LCP: 2500, // Largest Contentful Paint
        INP: 200, // Interaction to Next Paint (새로운 Core Web Vital)
        CLS: 0.1, // Cumulative Layout Shift
        FCP: 1800, // First Contentful Paint
        TTFB: 800, // Time to First Byte
        TTI: 3800, // Time to Interactive
      },

      // E2E 성능 최적화 설정
      E2E_OPTIMIZATION: {
        PARALLEL_EXECUTION: true,
        HEADLESS_BROWSER: true,
        DISABLE_ANIMATIONS: true,
        MOCK_API_CALLS: false, // 실제 API 성능 측정을 위해 false
      },
    },

    setupNodeEvents(on, config) {
      // 플러그인 등록

      // cypress-axe는 최신 버전에서 플러그인 설정이 불필요합니다
      // commands는 support/e2e.ts 파일에서 import됩니다

      // 코드 커버리지 플러그인 (개발 환경에서만)
      if (config.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@cypress/code-coverage/task')(on, config)
      }

      // 커스텀 태스크 정의
      on('task', {
        // 백엔드 API 상태 확인
        checkBackendHealth() {
          return new Promise(resolve => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const http = require('http')
            const req = http.request(
              'http://127.0.0.1:8001/api/v1/projects/',
              {
                method: 'GET',
              },
              (res: { statusCode: number }) => {
                resolve(res.statusCode === 200)
              }
            )
            req.on('error', () => resolve(false))
            req.end()
          })
        },

        // 에러 시나리오를 위한 서버 설정
        configureErrorScenario(scenario: string) {
          console.log(`Configuring error scenario: ${scenario}`)
          // 실제 구현에서는 테스트 전용 API를 통해 에러 상태 설정
          return null
        },

        // 테스트 데이터 초기화
        resetTestData() {
          console.log('Resetting test data...')
          // 실제 구현에서는 DB 초기화 또는 테스트 데이터 리셋
          return null
        },

        // 로그 출력 (디버깅용)
        log(message: string) {
          console.log(`[CYPRESS LOG] ${message}`)
          return null
        },
      })

      return config
    },
  },

  // 컴포넌트 테스트 설정 (미래 확장용)
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
  },
})
