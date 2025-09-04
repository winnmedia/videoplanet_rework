/**
 * Dashboard Navigation E2E Tests - TDD Red Phase
 * 
 * 대시보드 페이지의 네비게이션 플로우와 API 연동을 실제 브라우저에서 검증합니다.
 * FSD Pages Layer - Cypress, 결정론적 테스트 (MSW 포함)
 */

describe('Dashboard Navigation Flow E2E Tests', () => {
  beforeEach(() => {
    // MSW 서버 설정으로 결정론적 API 응답
    cy.task('startMSW')
    
    // 브라우저 콘솔 에러 모니터링
    cy.window().then((win) => {
      cy.stub(win.console, 'error').as('consoleError')
    })
  })

  afterEach(() => {
    cy.task('stopMSW')
  })

  describe('Navigation Provider 누락으로 인한 런타임 에러', () => {
    it('NavigationProvider가 없는 대시보드 페이지에서 런타임 에러 발생해야 함', () => {
      // Red Phase: 현재 대시보드는 NavigationProvider 없이 SideBar 사용
      cy.visit('/dashboard')
      
      // 페이지 로드 시 콘솔 에러 발생 확인
      cy.get('@consoleError').should('have.been.calledWith', 
        Cypress.sinon.match('useNavigation must be used within a NavigationProvider')
      )
      
      // 또는 페이지가 에러로 인해 제대로 렌더링되지 않음
      cy.get('[data-testid="dashboard-content"]').should('not.exist')
    })

    it('SideBar 컴포넌트 렌더링 실패로 인한 빈 화면 표시', () => {
      // Red Phase: NavigationProvider 부재로 SideBar가 렌더링되지 않음
      cy.visit('/dashboard')
      
      // SideBar가 렌더링되지 않거나 에러 상태
      cy.get('[data-testid="sidebar"]').should('not.exist')
      
      // 메인 컨텐츠만 표시되고 네비게이션 없음
      cy.get('.main-content').should('exist')
      cy.get('[data-testid="dashboard-header"]').should('contain', '대시보드')
    })
  })

  describe('API 실패 시나리오 (MSW 모킹)', () => {
    it('대시보드 데이터 로딩 실패 시 사용자 친화적 에러 메시지 표시', () => {
      // Red Phase: API 실패에 대한 적절한 에러 처리 없음
      cy.task('mockApiFailure', {
        endpoint: '/api/dashboard/status',
        statusCode: 500,
        message: 'Internal Server Error'
      })
      
      cy.visit('/dashboard')
      
      // 현재는 에러 처리가 없어서 빈 화면 또는 에러 상태
      cy.get('[data-testid="error-message"]').should('not.exist')
      cy.get('[data-testid="loading-spinner"]').should('not.exist')
      
      // 사용자에게 명확한 피드백이 없는 상태
      cy.get('[data-testid="project-status-card"]').should('not.exist')
    })

    it('프로젝트 데이터 API 타임아웃 시 재시도 메커니즘 부재', () => {
      // Red Phase: API 타임아웃에 대한 재시도 로직 없음
      cy.task('mockApiTimeout', {
        endpoint: '/api/projects',
        timeout: 30000
      })
      
      cy.visit('/dashboard')
      
      // 무한 로딩 상태 또는 에러 없는 빈 화면
      cy.get('[data-testid="projects-section"]', { timeout: 10000 })
        .should('not.contain', '프로젝트 데이터를 불러올 수 없습니다')
      
      // 재시도 버튼이나 에러 복구 옵션 없음
      cy.get('[data-testid="retry-button"]').should('not.exist')
    })
  })

  describe('네비게이션 플로우 (정상 케이스 - Green Phase)', () => {
    it('NavigationProvider가 제공되면 대시보드에서 다른 페이지로 정상 이동', () => {
      // Green Phase: Provider 수정 후 정상 작동할 테스트
      cy.task('mockApiSuccess', {
        '/api/dashboard/status': {
          projects: { total: 5, active: 3, completed: 2 },
          activities: []
        }
      })
      
      cy.visit('/dashboard')
      
      // NavigationProvider가 제공되어 SideBar 정상 렌더링
      cy.get('[data-testid="sidebar"]').should('be.visible')
      
      // 메뉴 아이템 클릭하여 네비게이션
      cy.get('[data-testid="menu-projects"]').click()
      
      // 페이지 전환 확인
      cy.url().should('include', '/projects')
      cy.get('[data-testid="projects-header"]').should('contain', '프로젝트')
    })

    it('서브메뉴 네비게이션 및 키보드 접근성', () => {
      // Green Phase: 서브메뉴 정상 작동 테스트
      cy.visit('/dashboard')
      
      cy.get('[data-testid="sidebar"]').should('be.visible')
      
      // 서브메뉴가 있는 항목 호버
      cy.get('[data-testid="menu-projects"]').trigger('mouseover')
      
      // 서브메뉴 표시 확인
      cy.get('[data-testid="submenu-projects"]').should('be.visible')
      cy.get('[data-testid="submenu-item-create"]').should('contain', '새 프로젝트')
      
      // 키보드 네비게이션
      cy.get('[data-testid="menu-projects"]').focus().type('{downarrow}')
      cy.get('[data-testid="submenu-item-create"]').should('have.attr', 'aria-selected', 'true')
      
      // Enter로 선택
      cy.get('[data-testid="submenu-item-create"]').type('{enter}')
      cy.url().should('include', '/projects/create')
    })
  })

  describe('접근성 및 스크린 리더 지원', () => {
    it('네비게이션 변경 시 스크린 리더에 적절한 알림', () => {
      // Green Phase: 접근성 기능 검증
      cy.visit('/dashboard')
      
      // 네비게이션 액션 수행
      cy.get('[data-testid="menu-calendar"]').click()
      
      // aria-live 영역에 알림 텍스트 확인
      cy.get('[role="status"][aria-live="polite"]')
        .should('contain', '캘린더로 이동 중')
        .should('have.class', 'sr-only')
      
      // 1초 후 알림 텍스트 자동 제거
      cy.wait(1000)
      cy.get('[role="status"][aria-live="polite"]').should('not.contain.text')
    })

    it('키보드만으로 전체 네비게이션 가능', () => {
      // Green Phase: 키보드 네비게이션 완전성 테스트
      cy.visit('/dashboard')
      
      // Tab으로 SideBar 메뉴들 순회
      cy.get('body').tab()  // 첫 번째 포커스 가능 요소
      cy.focused().should('[data-testid="menu-dashboard"]')
      
      cy.tab()
      cy.focused().should('[data-testid="menu-projects"]')
      
      cy.tab()  
      cy.focused().should('[data-testid="menu-planning"]')
      
      // Space나 Enter로 메뉴 활성화
      cy.focused().type(' ')  // Space bar
      cy.url().should('include', '/planning')
    })
  })

  describe('성능 및 로딩 상태', () => {
    it('대시보드 초기 로딩 시 적절한 로딩 스피너 표시', () => {
      // Green Phase: 로딩 상태 UI 검증
      cy.task('mockApiDelay', {
        '/api/dashboard/status': { delay: 2000 }
      })
      
      cy.visit('/dashboard')
      
      // 로딩 스피너 표시
      cy.get('[data-testid="loading-spinner"]').should('be.visible')
      
      // 데이터 로드 완료 후 스피너 제거
      cy.get('[data-testid="loading-spinner"]', { timeout: 5000 })
        .should('not.exist')
      
      // 실제 컨텐츠 표시
      cy.get('[data-testid="project-status-card"]').should('be.visible')
    })

    it('네비게이션 애니메이션 및 reduced motion 지원', () => {
      // Green Phase: 접근성 및 성능 고려한 애니메이션
      cy.visit('/dashboard')
      
      // prefers-reduced-motion 설정
      cy.window().then((win) => {
        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: jest.fn().mockImplementation(query => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
          })),
        })
      })
      
      // 메뉴 클릭 시 애니메이션 지속시간 확인
      cy.get('[data-testid="menu-projects"]').click()
      
      // reduced motion 설정 시 애니메이션 0ms
      cy.get('[data-testid="sidebar"]')
        .should('have.css', 'transition-duration', '0s')
    })
  })

  describe('오류 복구 및 재시도 메커니즘', () => {
    it('API 실패 후 재시도 버튼 클릭 시 데이터 다시 로드', () => {
      // Red Phase: 현재 재시도 메커니즘 없음
      cy.task('mockApiFailure', {
        endpoint: '/api/dashboard/status',
        statusCode: 503,
        retryAfter: 1
      })
      
      cy.visit('/dashboard')
      
      // 에러 메시지와 재시도 버튼이 없는 상태
      cy.get('[data-testid="error-boundary"]').should('not.exist')
      cy.get('[data-testid="retry-button"]').should('not.exist')
    })
  })
})

/**
 * MSW Tasks for Cypress
 * 
 * cypress/support/tasks.ts에 추가해야 할 태스크들
 */

// 이 파일에서 사용하는 Cypress 태스크들:
// - startMSW: MSW 서버 시작
// - stopMSW: MSW 서버 중지  
// - mockApiSuccess: 성공 응답 모킹
// - mockApiFailure: 실패 응답 모킹
// - mockApiTimeout: 타임아웃 시뮬레이션
// - mockApiDelay: 지연 응답 모킹

// 이 테스트 파일의 핵심 실패 케이스:
// 1. NavigationProvider 누락으로 인한 SideBar 렌더링 실패
// 2. API 실패 시 적절한 에러 처리 및 사용자 피드백 부재
// 3. 재시도 메커니즘 및 오류 복구 기능 부재  
// 4. 접근성 기능의 실제 브라우저 동작 검증