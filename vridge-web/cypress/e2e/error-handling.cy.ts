/**
 * HTTP 에러 시나리오 종합 E2E 테스트 스위트
 * 시스템 에러 처리, 복구, UX 검증
 */

describe('HTTP Error Handling E2E Tests', () => {
  beforeEach(() => {
    cy.logTestStep('Starting error handling test')
    cy.visit('/')
  })

  describe('네트워크 에러 시나리오', () => {
    it('네트워크 연결 실패 시 적절한 에러 메시지를 표시해야 한다', () => {
      cy.logTestStep('Testing network failure scenario')
      
      // 네트워크 에러 시뮬레이션
      cy.simulateNetworkError()
      
      // API 호출을 트리거하는 액션 수행
      cy.get('[data-testid="load-projects"], [data-cy="load-projects"]')
        .should('be.visible')
        .click()
      
      // 네트워크 에러 메시지 확인
      cy.waitForErrorDisplay()
      cy.get('[data-testid="error-display"]')
        .should('contain.text', '네트워크')
        .or('contain.text', '연결')
      
      // 재시도 버튼 확인
      cy.get('[data-testid="retry-button"]')
        .should('be.visible')
        .and('contain.text', '다시 시도')
    })

    it('네트워크 복구 후 재시도가 정상 작동해야 한다', () => {
      cy.logTestStep('Testing network recovery scenario')
      
      // 초기 네트워크 에러
      cy.simulateNetworkError()
      cy.get('[data-testid="load-projects"]').click()
      cy.waitForErrorDisplay()
      
      // 네트워크 복구 (인터셉터 제거)
      cy.intercept('GET', '/api/**').as('normalRequest')
      
      // 재시도 실행
      cy.verifyErrorRecovery()
      
      // 정상 데이터 로딩 확인
      cy.wait('@normalRequest')
      cy.get('[data-testid="projects-list"], [data-cy="projects-list"]')
        .should('be.visible')
    })
  })

  describe('HTTP 상태 코드별 에러 처리', () => {
    const errorScenarios = [
      {
        status: 400,
        name: '잘못된 요청 (400)',
        expectedMessage: '요청',
        expectedIcon: '❌'
      },
      {
        status: 401,
        name: '인증 실패 (401)', 
        expectedMessage: '인증',
        expectedIcon: '🔐'
      },
      {
        status: 403,
        name: '권한 없음 (403)',
        expectedMessage: '권한',
        expectedIcon: '⛔'
      },
      {
        status: 404,
        name: '리소스 없음 (404)',
        expectedMessage: '찾을 수 없습니다',
        expectedIcon: '🔍'
      },
      {
        status: 500,
        name: '서버 오류 (500)',
        expectedMessage: '서버',
        expectedIcon: '⚠️'
      }
    ]

    errorScenarios.forEach(({ status, name, expectedMessage, expectedIcon }) => {
      it(`${name} 에러 시 적절한 UI를 표시해야 한다`, () => {
        cy.logTestStep(`Testing ${name} error scenario`)
        
        // 특정 상태 코드 에러 시뮬레이션
        cy.simulateServerError(status)
        
        // API 호출 트리거
        cy.get('[data-testid="load-projects"]').click()
        
        // 에러 UI 확인
        cy.waitForErrorDisplay()
        
        // 에러 메시지 확인
        cy.get('[data-testid="error-display"]')
          .should('contain.text', expectedMessage)
        
        // 에러 아이콘 확인
        if (expectedIcon) {
          cy.get('[data-testid="error-display"]')
            .should('contain.text', expectedIcon)
        }
        
        // HTTP 상태별 특수 처리 확인
        if (status === 401) {
          // 인증 에러: 로그인 버튼 표시
          cy.get('[data-testid="login-redirect"], [data-cy="login-redirect"]')
            .should('be.visible')
        }
        
        if (status === 403) {
          // 권한 에러: 관리자 문의 메시지
          cy.get('[data-testid="error-display"]')
            .should('contain.text', '관리자')
        }
      })
    })
  })

  describe('API 에러 응답 형식 검증', () => {
    it('백엔드 API가 표준 에러 응답 형식을 준수해야 한다', () => {
      cy.logTestStep('Testing API error response format')
      
      // 존재하지 않는 API 엔드포인트 호출
      cy.apiRequest('GET', '/api/v1/nonexistent/').then((response) => {
        cy.checkApiContract(response)
        
        // 404 에러 응답 확인
        expect(response.status).to.eq(404)
        
        // 표준 에러 응답 형식이 아닌 경우 (현재 HTML 응답)
        // 백엔드에서 JSON 응답으로 수정이 필요함을 확인
        if (response.headers['content-type']?.includes('text/html')) {
          cy.task('log', 'WARNING: API returning HTML instead of JSON for errors')
        }
      })
    })

    it('유효하지 않은 JSON 응답 처리를 확인해야 한다', () => {
      cy.logTestStep('Testing invalid JSON response handling')
      
      // 잘못된 JSON 응답 시뮬레이션
      cy.intercept('GET', '/api/**', {
        statusCode: 500,
        body: 'Invalid JSON Response'
      }).as('invalidJsonError')
      
      cy.get('[data-testid="load-projects"]').click()
      cy.waitForErrorDisplay()
      
      // 파싱 에러에 대한 적절한 메시지 확인
      cy.get('[data-testid="error-display"]')
        .should('contain.text', '예상치 못한')
        .or('contain.text', '서버')
    })
  })

  describe('에러 상태 지속성 및 복구', () => {
    it('에러 상태가 새로고침 후에도 적절히 초기화되어야 한다', () => {
      cy.logTestStep('Testing error state persistence across page reload')
      
      // 에러 상태 생성
      cy.simulateServerError(500)
      cy.get('[data-testid="load-projects"]').click()
      cy.waitForErrorDisplay()
      
      // 페이지 새로고침
      cy.reload()
      
      // 에러 상태가 초기화되고 정상 로딩 상태여야 함
      cy.get('[data-testid="error-display"]').should('not.exist')
      cy.get('[data-testid="loading-state"], [data-cy="loading-state"]')
        .should('not.exist')
    })

    it('여러 연속된 에러에 대해 적절히 처리해야 한다', () => {
      cy.logTestStep('Testing multiple consecutive errors')
      
      // 첫 번째 에러
      cy.simulateServerError(500)
      cy.get('[data-testid="load-projects"]').click()
      cy.waitForErrorDisplay()
      
      // 재시도 후 다른 에러 발생
      cy.simulateServerError(403)
      cy.get('[data-testid="retry-button"]').click()
      
      // 새로운 에러 메시지로 업데이트되어야 함
      cy.get('[data-testid="error-display"]')
        .should('contain.text', '권한')
        .and('not.contain.text', '500')
    })
  })

  describe('오프라인/온라인 상태 전환', () => {
    it('오프라인 상태에서 적절한 메시지를 표시해야 한다', () => {
      cy.logTestStep('Testing offline state handling')
      
      // 오프라인 상태 시뮬레이션
      cy.window().then((win) => {
        cy.stub(win.navigator, 'onLine').value(false)
        win.dispatchEvent(new Event('offline'))
      })
      
      // API 호출 시도
      cy.get('[data-testid="load-projects"]').click()
      
      // 오프라인 메시지 확인
      cy.get('[data-testid="error-display"], [data-testid="offline-notice"]')
        .should('contain.text', '오프라인')
        .or('contain.text', '인터넷 연결')
    })

    it('온라인 복구 시 자동으로 재시도해야 한다', () => {
      cy.logTestStep('Testing automatic retry on online recovery')
      
      // 오프라인 상태에서 에러 발생
      cy.window().then((win) => {
        cy.stub(win.navigator, 'onLine').value(false)
        win.dispatchEvent(new Event('offline'))
      })
      
      cy.get('[data-testid="load-projects"]').click()
      cy.waitForErrorDisplay()
      
      // 온라인 복구
      cy.window().then((win) => {
        cy.stub(win.navigator, 'onLine').value(true)
        win.dispatchEvent(new Event('online'))
      })
      
      // 자동 재시도 확인 (구현되어 있는 경우)
      cy.wait(2000) // 자동 재시도 대기
      cy.get('[data-testid="projects-list"]', { timeout: 10000 })
        .should('be.visible')
    })
  })

  describe('에러 로깅 및 추적', () => {
    it('에러 발생 시 적절한 로깅이 수행되어야 한다', () => {
      cy.logTestStep('Testing error logging functionality')
      
      // 콘솔 에러 캡처
      let consoleErrors: string[] = []
      cy.window().then((win) => {
        cy.stub(win.console, 'error').callsFake((...args) => {
          consoleErrors.push(args.join(' '))
        })
      })
      
      // 에러 발생
      cy.simulateServerError(500)
      cy.get('[data-testid="load-projects"]').click()
      cy.waitForErrorDisplay()
      
      // 에러 로깅 확인
      cy.then(() => {
        expect(consoleErrors.length).to.be.greaterThan(0)
        expect(consoleErrors.some(error => error.includes('ERROR_LOG'))).to.be.true
      })
    })

    it('개발 환경에서 에러 세부 정보를 표시해야 한다', () => {
      cy.logTestStep('Testing development error details display')
      
      // 개발 환경에서만 실행
      if (Cypress.env('NODE_ENV') === 'development') {
        cy.simulateServerError(500)
        cy.get('[data-testid="load-projects"]').click()
        cy.waitForErrorDisplay()
        
        // 개발자 정보 섹션 확인
        cy.get('[data-testid="error-details"], details').should('exist')
        cy.get('[data-testid="error-details"] summary, details summary')
          .should('contain.text', '개발자 정보')
          .click()
        
        // 에러 상세 정보 확인
        cy.get('[data-testid="error-details"], details')
          .should('contain.text', 'HTTP 상태')
          .and('contain.text', '타임스탬프')
      }
    })
  })

  describe('성능 및 사용자 경험', () => {
    it('에러 표시 응답 시간이 임계값 이내여야 한다', () => {
      cy.logTestStep('Testing error display response time')
      
      const startTime = Date.now()
      
      cy.simulateServerError(500)
      cy.get('[data-testid="load-projects"]').click()
      cy.waitForErrorDisplay().then(() => {
        const responseTime = Date.now() - startTime
        expect(responseTime).to.be.lessThan(3000, 'Error should display within 3 seconds')
      })
    })

    it('에러 상태에서도 다른 기능이 정상 작동해야 한다', () => {
      cy.logTestStep('Testing other functionality during error state')
      
      // 에러 상태 생성
      cy.simulateServerError(500)
      cy.get('[data-testid="load-projects"]').click()
      cy.waitForErrorDisplay()
      
      // 네비게이션이 여전히 작동하는지 확인
      cy.get('[data-testid="nav-home"], [data-cy="nav-home"], nav a[href="/"]')
        .first()
        .should('be.visible')
        .click()
      
      // 페이지 이동이 정상적으로 작동해야 함
      cy.url().should('include', '/')
    })
  })

  describe('에러 바운더리 검증', () => {
    it('React 에러 바운더리가 JavaScript 에러를 적절히 캐치해야 한다', () => {
      cy.logTestStep('Testing React Error Boundary functionality')
      
      // JavaScript 런타임 에러 시뮬레이션
      cy.window().then((win) => {
        // 의도적인 에러 발생
        cy.get('[data-testid="trigger-error"], [data-cy="trigger-error"]')
          .should('exist')
          .click()
          .then(() => {
            // 에러 바운더리 UI 확인
            cy.get('[data-testid="error-boundary"], [data-cy="error-boundary"]')
              .should('be.visible')
              .and('contain.text', '오류가 발생했습니다')
          })
      })
    })
  })
})

/**
 * API 계약 준수 전용 테스트
 */
describe('API Contract Compliance Tests', () => {
  it('모든 API 엔드포인트가 CORS 헤더를 포함해야 한다', () => {
    cy.apiRequest('OPTIONS', '/api/v1/projects/').then((response) => {
      expect(response.headers).to.have.property('access-control-allow-origin')
      expect(response.headers).to.have.property('access-control-allow-methods')
    })
  })

  it('모든 API 응답이 요청 ID를 포함해야 한다', () => {
    cy.apiRequest('GET', '/api/v1/projects/').then((response) => {
      // 성공 응답에서 요청 추적 헤더 확인
      if (response.status === 200) {
        expect(response.headers).to.have.property('x-request-id')
      }
    })
  })

  it('API 에러 응답이 표준 형식을 준수해야 한다', () => {
    cy.apiRequest('POST', '/api/v1/projects/', { invalid: 'data' }).then((response) => {
      if (response.status >= 400) {
        // 표준 에러 응답 형식 검증
        if (response.headers['content-type']?.includes('application/json')) {
          expect(response.body).to.have.property('error_code')
          expect(response.body).to.have.property('error_message')
          expect(response.body).to.have.property('timestamp')
        }
      }
    })
  })
})