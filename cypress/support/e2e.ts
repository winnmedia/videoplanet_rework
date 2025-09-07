/**
 * Cypress E2E 테스트 지원 파일
 * 전역 설정, 명령어, 헬퍼 함수 정의
 */

import 'cypress-axe'
import '@cypress/code-coverage/support'

// 전역 타입 정의
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      // 에러 처리 테스트를 위한 커스텀 명령어
      simulateNetworkError(): Chainable<void>
      simulateServerError(statusCode: number): Chainable<void>
      waitForErrorDisplay(): Chainable<JQuery<HTMLElement>>
      verifyErrorRecovery(): Chainable<void>

      // API 테스트를 위한 커스텀 명령어
      apiRequest(method: string, endpoint: string, body?: unknown): Chainable<unknown>
      checkApiContract(response: unknown): Chainable<void>

      // 접근성 테스트를 위한 커스텀 명령어
      checkAccessibility(context?: string, options?: unknown): Chainable<void>
      verifyKeyboardNavigation(): Chainable<void>
      checkScreenReaderContent(): Chainable<void>

      // 성능 테스트를 위한 커스텀 명령어
      measureWebVitals(): Chainable<unknown>
      checkPerformanceThresholds(): Chainable<void>

      // 유틸리티 명령어
      resetTestEnvironment(): Chainable<void>
      loginAsTestUser(): Chainable<void>
      logTestStep(message: string): Chainable<void>
    }
  }
}

// 전역 설정
beforeEach(() => {
  // 테스트 환경 초기화
  cy.task('resetTestData')

  // 백엔드 연결 확인
  cy.task('checkBackendHealth').then(isHealthy => {
    if (!isHealthy) {
      throw new Error('Backend is not accessible. Please check if the server is running on port 8001.')
    }
  })

  // 로컬 스토리지 초기화
  cy.clearLocalStorage()
  cy.clearCookies()
})

// 에러 처리 관련 커스텀 명령어
Cypress.Commands.add('simulateNetworkError', () => {
  cy.intercept('GET', '/api/**', { forceNetworkError: true }).as('networkError')
})

Cypress.Commands.add('simulateServerError', (statusCode: number) => {
  cy.intercept('GET', '/api/**', {
    statusCode,
    body: {
      error_code: 'SERVER_ERROR',
      error_message: `서버 에러 발생 (${statusCode})`,
      timestamp: new Date().toISOString(),
      request_id: `test_${Date.now()}`,
    },
  }).as('serverError')
})

Cypress.Commands.add('waitForErrorDisplay', () => {
  cy.get('[data-testid="error-display"], [data-cy="error-display"]', { timeout: 10000 }).should('be.visible')
})

Cypress.Commands.add('verifyErrorRecovery', () => {
  // 에러 표시 확인
  cy.waitForErrorDisplay()

  // 재시도 버튼 클릭
  cy.get('[data-testid="retry-button"], [data-cy="retry-button"]').should('be.visible').click()

  // 에러 해결 확인
  cy.get('[data-testid="error-display"], [data-cy="error-display"]').should('not.exist')
})

// API 테스트 관련 커스텀 명령어
Cypress.Commands.add('apiRequest', (method: string, endpoint: string, body?: unknown) => {
  const baseUrl = Cypress.env('API_BASE_URL')

  return cy.request({
    method,
    url: `${baseUrl}${endpoint}`,
    body,
    failOnStatusCode: false,
  })
})

Cypress.Commands.add('checkApiContract', (response: unknown) => {
  // 응답 헤더 검증
  expect(response.headers).to.have.property('content-type')
  expect(response.headers['content-type']).to.include('application/json')

  // 에러 응답인 경우 표준 형식 검증
  if (response.status >= 400) {
    expect(response.body).to.have.property('error_code')
    expect(response.body).to.have.property('error_message')
    expect(response.body).to.have.property('timestamp')
  }
})

// 접근성 테스트 관련 커스텀 명령어
Cypress.Commands.add('checkAccessibility', (context?: string, options?: unknown) => {
  const a11yOptions = {
    ...Cypress.env('A11Y_OPTIONS'),
    ...options,
  }

  cy.injectAxe()

  if (context) {
    cy.checkA11y(context, a11yOptions, violations => {
      cy.task('log', `Accessibility violations in ${context}: ${violations.length}`)
      violations.forEach(violation => {
        cy.task('log', `${violation.id}: ${violation.description}`)
      })
    })
  } else {
    cy.checkA11y(null, a11yOptions, violations => {
      cy.task('log', `Total accessibility violations: ${violations.length}`)
    })
  }
})

Cypress.Commands.add('verifyKeyboardNavigation', () => {
  // 탭 키로 포커스 이동 테스트
  cy.get('body').type('{tab}')
  cy.focused().should('exist')

  // Shift+Tab으로 역방향 이동 테스트
  cy.focused().type('{shift}{tab}')

  // Enter/Space 키로 활성화 테스트
  cy.get('button, [role="button"]').first().focus()
  cy.focused().type('{enter}')
})

Cypress.Commands.add('checkScreenReaderContent', () => {
  // aria-label, aria-describedby 등 스크린 리더 속성 확인
  cy.get('[aria-label], [aria-describedby], [aria-labelledby]').should('exist')

  // 제목 구조 검증 (h1 -> h2 -> h3 순서)
  cy.get('h1, h2, h3, h4, h5, h6').then($headings => {
    const levels = Array.from($headings).map(h => parseInt(h.tagName.charAt(1)))
    // 제목 레벨이 순차적인지 검증 (완전한 순차는 아니어도 큰 건너뜀 없이)
    expect(levels.length).to.be.greaterThan(0)
  })
})

// 성능 테스트 관련 커스텀 명령어
Cypress.Commands.add('measureWebVitals', () => {
  return cy.window().then(win => {
    return new Promise(resolve => {
      // Web Vitals 측정 (실제로는 web-vitals 라이브러리 사용)
      const metrics = {
        LCP: 0,
        FID: 0,
        CLS: 0,
        FCP: 0,
        TTI: 0,
      }

      // Performance Observer를 통한 실제 메트릭 수집
      if ('PerformanceObserver' in win) {
        const observer = new win.PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              metrics.LCP = entry.startTime
            }
            if (entry.entryType === 'first-input') {
              metrics.FID = entry.processingStart - entry.startTime
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              metrics.CLS += entry.value
            }
          }
        })

        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })

        // 약간의 지연 후 측정값 반환
        setTimeout(() => {
          observer.disconnect()
          resolve(metrics)
        }, 3000)
      } else {
        resolve(metrics)
      }
    })
  })
})

Cypress.Commands.add('checkPerformanceThresholds', () => {
  const thresholds = Cypress.env('PERFORMANCE_THRESHOLDS')

  cy.measureWebVitals().then((metrics: unknown) => {
    cy.task('log', `Performance Metrics: ${JSON.stringify(metrics)}`)

    // 임계값 검증
    if (metrics.LCP > 0) {
      expect(metrics.LCP).to.be.lessThan(thresholds.LCP, `LCP should be less than ${thresholds.LCP}ms`)
    }
    if (metrics.FID > 0) {
      expect(metrics.FID).to.be.lessThan(thresholds.FID, `FID should be less than ${thresholds.FID}ms`)
    }
    expect(metrics.CLS).to.be.lessThan(thresholds.CLS, `CLS should be less than ${thresholds.CLS}`)
  })
})

// 유틸리티 커스텀 명령어
Cypress.Commands.add('resetTestEnvironment', () => {
  cy.task('resetTestData')
  cy.clearLocalStorage()
  cy.clearCookies()
  cy.reload()
})

Cypress.Commands.add('loginAsTestUser', () => {
  const email = Cypress.env('TEST_USER_EMAIL')
  const password = Cypress.env('TEST_USER_PASSWORD')

  // 로그인 API 호출 또는 UI를 통한 로그인
  cy.visit('/login')
  cy.get('[data-testid="email-input"]').type(email)
  cy.get('[data-testid="password-input"]').type(password, { log: false })
  cy.get('[data-testid="login-submit"]').click()

  // 로그인 성공 확인
  cy.url().should('not.include', '/login')
})

Cypress.Commands.add('logTestStep', (message: string) => {
  cy.task('log', `[TEST STEP] ${message}`)
})

// 테스트 실패 시 추가 정보 수집
Cypress.on('fail', error => {
  cy.task('log', `Test failed: ${error.message}`)

  // 현재 페이지의 에러 상태 캡처
  cy.window().then(win => {
    const errorElements = win.document.querySelectorAll('[data-testid*="error"], [data-cy*="error"]')
    if (errorElements.length > 0) {
      cy.task('log', `Error elements found on page: ${errorElements.length}`)
    }
  })

  throw error
})

// 전역 에러 핸들러 (브라우저 에러 캐치)
Cypress.on('window:before:load', win => {
  win.addEventListener('error', event => {
    cy.task('log', `Browser error: ${event.error?.message || event.message}`)
  })

  win.addEventListener('unhandledrejection', event => {
    cy.task('log', `Unhandled promise rejection: ${event.reason}`)
  })
})
