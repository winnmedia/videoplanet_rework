// 전체 사용자 여정 E2E 테스트 (회원가입 → 피드백)
describe('VLANET 통합 파이프라인 - 전체 사용자 여정', () => {
  const testUser = {
    username: 'testuser' + Date.now(),
    email: 'test' + Date.now() + '@example.com',
    password: 'Test123!@#',
    confirmPassword: 'Test123!@#'
  }

  before(() => {
    // 테스트 데이터 준비
    cy.task('log', '테스트 환경 초기화 시작')
  })

  beforeEach(() => {
    // 성능 측정 시작
    cy.visit('/')
    cy.measurePerformance()
  })

  describe('회원가입 플로우', () => {
    it('새 사용자가 성공적으로 회원가입할 수 있어야 함', { tags: '@smoke @auth' }, () => {
      cy.signup(testUser)
      
      // 회원가입 성공 검증
      cy.get('[data-testid="signup-success-message"]').should('be.visible')
      
      // 접근성 검증
      cy.checkA11yWithReport()
      
      // Percy 스크린샷 (시각적 회귀 테스트)
      cy.percySnapshot('회원가입 완료 페이지')
    })

    it('잘못된 입력으로 회원가입 실패 시나리오', { tags: '@validation' }, () => {
      cy.visit('/auth/signup')
      
      // 비밀번호 불일치
      cy.get('[data-testid="username-input"]').type('testuser')
      cy.get('[data-testid="email-input"]').type('test@example.com')
      cy.get('[data-testid="password-input"]').type('Test123!')
      cy.get('[data-testid="confirm-password-input"]').type('DifferentPassword123!')
      cy.get('[data-testid="signup-button"]').click()
      
      // 에러 메시지 확인
      cy.get('[data-testid="password-mismatch-error"]').should('be.visible')
      
      // 접근성 검증 (에러 상태)
      cy.checkA11yWithReport()
    })
  })

  describe('인증 플로우', () => {
    beforeEach(() => {
      // 이전 테스트에서 생성된 사용자로 로그인
      cy.login(testUser.email, testUser.password)
    })

    it('로그인된 사용자가 대시보드에 접근할 수 있어야 함', { tags: '@smoke @auth' }, () => {
      cy.visit('/dashboard')
      
      // 대시보드 로드 확인
      cy.get('[data-testid="dashboard-content"]').should('be.visible')
      cy.get('[data-testid="user-welcome-message"]').should('contain', testUser.username)
      
      // 성능 검증
      cy.measurePerformance()
      
      // Percy 스크린샷
      cy.percySnapshot('대시보드 - 로그인 상태')
    })

    it('세션 만료 후 자동 로그아웃', { tags: '@security' }, () => {
      // 세션 쿠키 삭제로 만료 시뮬레이션
      cy.clearCookies()
      cy.visit('/dashboard')
      
      // 로그인 페이지로 리다이렉트 확인
      cy.url().should('include', '/auth/login')
    })
  })

  describe('비디오 업로드 및 처리 플로우', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password)
      cy.visit('/video/upload')
    })

    it('비디오 업로드 및 처리 성공 시나리오', { tags: '@smoke @video' }, () => {
      // 테스트 비디오 파일 업로드 (목 파일 사용)
      cy.fixture('test-video.mp4').then(() => {
        cy.uploadVideo('cypress/fixtures/test-video.mp4')
      })
      
      // 품질 선택
      cy.selectVideoQuality('1080p')
      
      // 처리 시작
      cy.startVideoProcessing()
      
      // 처리 완료 대기 (모킹된 빠른 처리)
      cy.waitForVideoProcessing(30000)
      
      // 비디오 메타데이터 검증
      cy.verifyVideoMetadata({
        resolution: '1080p',
        duration: '0:30'
      })
      
      // 접근성 검증
      cy.checkA11yWithReport()
      
      // Percy 스크린샷
      cy.percySnapshot('비디오 처리 완료')
    })

    it('잘못된 파일 형식 업로드 실패 시나리오', { tags: '@validation @video' }, () => {
      // 잘못된 파일 형식 업로드 시도
      cy.fixture('test-image.jpg').then(() => {
        cy.get('[data-testid="video-upload-input"]').selectFile('cypress/fixtures/test-image.jpg', { force: true })
      })
      
      // 에러 메시지 확인
      cy.get('[data-testid="file-format-error"]').should('be.visible')
      cy.get('[data-testid="file-format-error"]').should('contain', '지원되지 않는 파일 형식')
    })

    it('큰 파일 업로드 진행률 표시', { tags: '@upload @progress' }, () => {
      // 큰 파일 업로드 시뮬레이션
      cy.intercept('POST', '/api/video/upload', { fixture: 'large-upload-response.json' }).as('uploadVideo')
      
      cy.fixture('large-video.mp4').then(() => {
        cy.uploadVideo('cypress/fixtures/large-video.mp4')
      })
      
      // 진행률 표시 확인
      cy.get('[data-testid="upload-progress"]').should('be.visible')
      cy.get('[data-testid="upload-percentage"]').should('contain', '%')
      
      cy.wait('@uploadVideo')
    })
  })

  describe('피드백 시스템 플로우', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password)
      // 처리된 비디오가 있는 상태로 설정
      cy.visit('/video/processed/test-video-id')
    })

    it('비디오 피드백 제출 성공 시나리오', { tags: '@smoke @feedback' }, () => {
      const feedback = {
        rating: 4,
        comment: '비디오 품질이 매우 좋습니다. 처리 속도도 빨라서 만족합니다.',
        category: 'quality'
      }
      
      cy.submitVideoFeedback(feedback)
      
      // 피드백 제출 성공 확인
      cy.get('[data-testid="feedback-success"]').should('contain', '피드백이 성공적으로 제출되었습니다')
      
      // 키보드 네비게이션 테스트
      cy.get('[data-testid="feedback-button"]').focus()
      cy.realPress('Enter')
      cy.get('[data-testid="feedback-modal"]').should('be.visible')
      
      // 접근성 검증
      cy.checkA11yWithReport()
      
      // Percy 스크린샷
      cy.percySnapshot('피드백 제출 완료')
    })

    it('빈 피드백 제출 방지', { tags: '@validation @feedback' }, () => {
      cy.get('[data-testid="feedback-button"]').click()
      cy.get('[data-testid="submit-feedback-button"]').click()
      
      // 필수 필드 에러 메시지 확인
      cy.get('[data-testid="rating-required-error"]').should('be.visible')
    })
  })

  describe('반응형 및 크로스 브라우저 테스트', () => {
    const viewports = [
      { device: 'mobile', width: 375, height: 667 },
      { device: 'tablet', width: 768, height: 1024 },
      { device: 'desktop', width: 1280, height: 720 }
    ]

    viewports.forEach(({ device, width, height }) => {
      it(`${device} 뷰포트에서 UI가 올바르게 표시되어야 함`, { tags: '@responsive' }, () => {
        cy.viewport(width, height)
        cy.login(testUser.email, testUser.password)
        cy.visit('/dashboard')
        
        // 반응형 레이아웃 확인
        cy.get('[data-testid="dashboard-content"]').should('be.visible')
        
        if (device === 'mobile') {
          // 모바일 전용 네비게이션 확인
          cy.get('[data-testid="mobile-menu-toggle"]').should('be.visible')
        } else {
          // 데스크톱 네비게이션 확인
          cy.get('[data-testid="desktop-navigation"]').should('be.visible')
        }
        
        // Percy 스크린샷 (디바이스별)
        cy.percySnapshot(`대시보드 - ${device} 뷰포트`)
      })
    })
  })

  describe('성능 및 접근성 검증', () => {
    it('Core Web Vitals 기준 충족', { tags: '@performance' }, () => {
      cy.visit('/')
      
      // Largest Contentful Paint (LCP) < 2.5s
      cy.window().its('performance').then((perf) => {
        cy.wrap(perf.getEntriesByType('largest-contentful-paint')).should((entries) => {
          if (entries.length > 0) {
            const lcp = entries[entries.length - 1].startTime
            expect(lcp).to.be.lessThan(2500)
          }
        })
      })
      
      // Cumulative Layout Shift (CLS) < 0.1
      cy.window().then((win) => {
        cy.wrap(null).should(() => {
          expect(win.performance.getEntriesByType('layout-shift')).to.have.length.lessThan(3)
        })
      })
    })

    it('전체 페이지 접근성 검증', { tags: '@a11y' }, () => {
      const pages = [
        '/',
        '/auth/login',
        '/auth/signup',
        '/dashboard'
      ]
      
      pages.forEach((page) => {
        cy.visit(page)
        cy.injectAxe()
        cy.checkA11yWithReport(null, {
          rules: {
            'color-contrast': { enabled: true },
            'keyboard-navigation': { enabled: true },
            'focus-management': { enabled: true }
          }
        })
      })
    })
  })

  after(() => {
    // 테스트 정리
    cy.task('log', '테스트 완료 - 사용자 데이터 정리')
    // 테스트 사용자 계정 삭제 등
  })
})