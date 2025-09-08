/**
 * HTTP 오류 감지 및 해결 E2E 테스트
 * 모든 400/500 HTTP 오류를 체계적으로 감지하고 사용자 경험을 검증
 */

describe('HTTP Error Detection and Resolution', () => {
  const httpErrors: Array<{
    url: string
    method: string
    expectedStatus: number
    errorType: '4xx' | '5xx'
    description: string
    userImpact: 'critical' | 'high' | 'medium' | 'low'
  }> = []

  beforeEach(() => {
    // HTTP 요청을 모니터링하여 오류 수집
    cy.intercept('**', req => {
      req.continue(res => {
        if (res.statusCode >= 400) {
          httpErrors.push({
            url: req.url,
            method: req.method,
            expectedStatus: res.statusCode,
            errorType: res.statusCode >= 500 ? '5xx' : '4xx',
            description: `${req.method} ${req.url} returned ${res.statusCode}`,
            userImpact: res.statusCode >= 500 ? 'critical' : res.statusCode === 404 ? 'high' : 'medium',
          })
        }
      })
    }).as('httpRequests')

    // 콘솔 에러도 수집
    cy.window().then(win => {
      cy.stub(win.console, 'error').as('consoleError')
    })

    cy.visit('/')
  })

  describe('랜딩페이지 HTTP 오류 검증', () => {
    it('메인 페이지 로딩 시 모든 리소스가 성공적으로 로드되어야 함', () => {
      cy.visit('/')

      // 페이지가 완전히 로드될 때까지 대기
      cy.get('body').should('be.visible')

      // 모든 이미지가 정상적으로 로드되는지 확인
      cy.get('img').each($img => {
        cy.wrap($img).should('have.prop', 'naturalWidth').and('be.greaterThan', 0)
      })

      // CSS 파일들이 정상적으로 로드되는지 확인
      cy.get('link[rel="stylesheet"]').each($link => {
        const href = $link.prop('href')
        if (href) {
          cy.request(href).its('status').should('eq', 200)
        }
      })

      // JavaScript 파일들이 정상적으로 로드되는지 확인
      cy.get('script[src]').each($script => {
        const src = $script.prop('src')
        if (src && src.includes('_next/static')) {
          cy.request(src).its('status').should('eq', 200)
        }
      })
    })

    it('배경 이미지와 아이콘이 404 오류 없이 로드되어야 함', () => {
      cy.visit('/')

      // 특정 문제가 있었던 이미지들 확인 (WebP 최적화 버전 우선)
      const criticalImages = [
        '/images/User/bg.webp',
        '/images/Home/new/end-bg.webp',
        '/images/Home/new/visual-bg.webp',
        '/images/Home/w_bg.webp',
      ]

      criticalImages.forEach(imagePath => {
        cy.request({
          url: imagePath,
          failOnStatusCode: false,
        }).then(response => {
          expect(response.status).to.eq(200, `Image ${imagePath} should load successfully`)
        })
      })
    })
  })

  describe('API 엔드포인트 HTTP 오류 검증', () => {
    const apiEndpoints = [
      { path: '/api/health', method: 'GET', description: '헬스체크' },
      { path: '/api/projects', method: 'GET', description: '프로젝트 목록' },
      { path: '/api/feedback', method: 'GET', description: '피드백 목록' },
      { path: '/api/auth/send-verification', method: 'POST', description: '이메일 인증' },
    ]

    apiEndpoints.forEach(endpoint => {
      it(`${endpoint.description} API가 500 오류 없이 응답해야 함`, () => {
        cy.request({
          url: endpoint.path,
          method: endpoint.method as any,
          failOnStatusCode: false,
          body: endpoint.method === 'POST' ? {} : undefined,
        }).then(response => {
          expect(response.status).to.be.lessThan(500, `${endpoint.path} should not return 500 errors`)

          // 400번대 오류는 허용하지만 로깅
          if (response.status >= 400 && response.status < 500) {
            cy.task('log', `4xx error on ${endpoint.path}: ${response.status}`)
          }
        })
      })
    })
  })

  describe('사용자 워크플로우 HTTP 오류 검증', () => {
    it('홈 → 대시보드 → 프로젝트 생성 플로우에서 HTTP 오류가 없어야 함', () => {
      // 홈페이지
      cy.visit('/')
      cy.wait(1000)

      // 대시보드로 이동
      cy.visit('/dashboard')
      cy.wait(1000)

      // 프로젝트 관리 페이지
      cy.visit('/projects/manage')
      cy.wait(1000)

      // 캘린더 페이지
      cy.visit('/calendar')
      cy.wait(1000)

      // 피드백 페이지 (존재하는 ID로 테스트)
      cy.visit('/feedback/1')
      cy.wait(1000)

      // 수집된 HTTP 오류 검증
      cy.then(() => {
        const criticalErrors = httpErrors.filter(
          error => error.errorType === '5xx' || (error.errorType === '4xx' && error.userImpact === 'critical')
        )

        if (criticalErrors.length > 0) {
          cy.task('log', `Critical HTTP errors found: ${JSON.stringify(criticalErrors, null, 2)}`)
          throw new Error(`Found ${criticalErrors.length} critical HTTP errors`)
        }
      })
    })

    it('비디오 플래닝 워크플로우에서 HTTP 오류가 없어야 함', () => {
      cy.visit('/planning')
      cy.wait(2000)

      // 폼 인터랙션 테스트 (실제 제출하지 않음)
      cy.get('input, textarea, select')
        .first()
        .then($input => {
          if ($input.length > 0) {
            cy.wrap($input).type('test content', { force: true })
          }
        })

      cy.wait(1000)

      // 수집된 HTTP 오류 검증
      cy.then(() => {
        const serverErrors = httpErrors.filter(error => error.errorType === '5xx')
        expect(serverErrors.length).to.eq(0, 'No 500 errors should occur in planning workflow')
      })
    })
  })

  describe('네트워크 오류 복구 테스트', () => {
    it('네트워크 오류 후 재시도가 정상 작동해야 함', () => {
      // 네트워크 오류 시뮬레이션
      cy.intercept('/api/projects', { forceNetworkError: true }).as('networkError')

      cy.visit('/dashboard')
      cy.wait('@networkError')

      // 정상 응답으로 복구
      cy.intercept('/api/projects', { fixture: 'projects.json' }).as('normalResponse')

      // 페이지 새로고침으로 재시도
      cy.reload()
      cy.wait('@normalResponse')

      // 페이지가 정상적으로 로드되는지 확인
      cy.get('body').should('be.visible')
    })
  })

  describe('접근성 관련 HTTP 오류 검증', () => {
    it('접근성 필수 리소스가 모두 로드되어야 함', () => {
      cy.visit('/')

      // 폰트 파일 확인
      cy.get('link[rel="preload"][as="font"]').each($link => {
        const href = $link.prop('href')
        if (href) {
          cy.request(href).its('status').should('eq', 200)
        }
      })

      // 아이콘 파일 확인
      cy.get('link[rel="icon"], link[rel="apple-touch-icon"]').each($link => {
        const href = $link.prop('href')
        if (href) {
          cy.request({
            url: href,
            failOnStatusCode: false,
          })
            .its('status')
            .should('be.lessThan', 500)
        }
      })
    })
  })

  afterEach(() => {
    // 테스트 후 수집된 오류 리포트 생성
    cy.then(() => {
      if (httpErrors.length > 0) {
        const errorReport = {
          timestamp: new Date().toISOString(),
          testName: Cypress.currentTest.title,
          errors: httpErrors,
          summary: {
            total: httpErrors.length,
            critical: httpErrors.filter(e => e.userImpact === 'critical').length,
            high: httpErrors.filter(e => e.userImpact === 'high').length,
            medium: httpErrors.filter(e => e.userImpact === 'medium').length,
            serverErrors: httpErrors.filter(e => e.errorType === '5xx').length,
            clientErrors: httpErrors.filter(e => e.errorType === '4xx').length,
          },
        }

        cy.task('log', `HTTP Error Report: ${JSON.stringify(errorReport, null, 2)}`)
      }
    })

    // 다음 테스트를 위해 오류 배열 초기화
    httpErrors.length = 0
  })
})

/**
 * TODO(human): 아래 함수에서 실제 오류 수정 로직을 구현해주세요.
 * 발견된 HTTP 오류를 바탕으로 다음 중 하나를 선택해 구현:
 * 1. 누락된 이미지 파일 추가
 * 2. API 엔드포인트 오류 응답 수정
 * 3. 라우팅 오류 수정
 * 4. CORS 설정 문제 해결
 */
function fixHttpErrors(errors: any[]) {
  // 오류 타입별 수정 로직
  errors.forEach(error => {
    if (error.url.includes('/images/') && error.expectedStatus === 404) {
      // 이미지 파일 누락 처리
      console.log(`Missing image: ${error.url}`)
    } else if (error.url.includes('/api/') && error.expectedStatus >= 500) {
      // API 서버 오류 처리
      console.log(`API server error: ${error.url}`)
    }
  })
}
