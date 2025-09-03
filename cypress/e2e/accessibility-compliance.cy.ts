// WCAG 2.1 AA 접근성 준수 검증 E2E 테스트

describe('접근성 준수 검증 (WCAG 2.1 AA)', () => {
  const testUser = {
    email: 'accessibility@test.com',
    password: 'Test123!@#'
  }
  
  beforeEach(() => {
    // 접근성 테스트를 위한 환경 설정
    cy.visit('/')
    cy.injectAxe()
  })
  
  describe('핵심 페이지 접근성 검증', () => {
    const criticalPages = [
      { path: '/', name: '홈페이지' },
      { path: '/auth/login', name: '로그인 페이지' },
      { path: '/auth/signup', name: '회원가입 페이지' },
      { path: '/dashboard', name: '대시보드', requiresAuth: true },
      { path: '/projects/new', name: '프로젝트 생성', requiresAuth: true },
      { path: '/video-planning', name: 'AI 비디오 기획', requiresAuth: true },
      { path: '/feedback/test-video', name: '비디오 피드백', requiresAuth: true }
    ]
    
    criticalPages.forEach((page) => {
      it(`${page.name} 접근성 검증`, { tags: ['@a11y', '@critical'] }, () => {
        if (page.requiresAuth) {
          cy.login(testUser.email, testUser.password)
        }
        
        cy.visit(page.path)
        
        // 페이지 로딩 완료 대기
        cy.get('main, [role="main"], [data-testid="main-content"]')
          .should('be.visible')
        
        // 포괄적인 접근성 검사
        cy.checkA11y(null, {
          rules: {
            // 색상 대비 검사 (WCAG AA 기준 4.5:1)
            'color-contrast': { enabled: true },
            
            // 키보드 접근성
            'keyboard': { enabled: true },
            'focus-order-semantics': { enabled: true },
            'tabindex': { enabled: true },
            
            // ARIA 속성 올바른 사용
            'aria-allowed-attr': { enabled: true },
            'aria-required-attr': { enabled: true },
            'aria-required-children': { enabled: true },
            'aria-required-parent': { enabled: true },
            'aria-roles': { enabled: true },
            'aria-valid-attr': { enabled: true },
            'aria-valid-attr-value': { enabled: true },
            
            // 의미론적 HTML
            'landmark-one-main': { enabled: true },
            'landmark-complementary-is-top-level': { enabled: true },
            'page-has-heading-one': { enabled: true },
            'heading-order': { enabled: true },
            
            // 이미지 대체 텍스트
            'image-alt': { enabled: true },
            'image-redundant-alt': { enabled: true },
            
            // 폼 접근성
            'label': { enabled: true },
            'form-field-multiple-labels': { enabled: true },
            
            // 링크 접근성
            'link-name': { enabled: true },
            'link-in-text-block': { enabled: true }
          },
          tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
        }, (violations) => {
          // 위반사항 상세 로깅
          if (violations.length > 0) {
            cy.task('log', `${page.name}에서 ${violations.length}개의 접근성 위반사항 발견:`)
            violations.forEach((violation, index) => {
              cy.task('log', `${index + 1}. ${violation.id}: ${violation.description}`)
              cy.task('log', `   영향: ${violation.impact} | 도움말: ${violation.helpUrl}`)
              
              violation.nodes.forEach((node, nodeIndex) => {
                cy.task('log', `   노드 ${nodeIndex + 1}: ${node.target} - ${node.failureSummary}`)
              })
            })
          }
        })
        
        // Percy 접근성 스크린샷 (색상 대비 등 시각적 확인용)
        cy.percySnapshot(`접근성 검증 - ${page.name}`, {
          widths: [1280],
          percyCSS: `
            /* 포커스 상태 강조 표시 */
            :focus {
              outline: 3px solid #ff0000 !important;
              outline-offset: 2px !important;
            }
          `
        })
      })
    })
  })
  
  describe('키보드 내비게이션 테스트', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password)
    })
    
    it('Tab 순서 및 포커스 관리', { tags: ['@a11y', '@keyboard'] }, () => {
      cy.visit('/dashboard')
      
      // 키보드 전용 내비게이션 테스트
      cy.get('body').focus()
      
      // Tab을 통한 순차적 이동
      const expectedFocusOrder = [
        '[data-testid="skip-to-content"]',
        '[data-testid="main-navigation"] a:first',
        '[data-testid="user-menu-trigger"]',
        '[data-testid="notification-bell"]',
        '[data-testid="main-content"] a:first, [data-testid="main-content"] button:first'
      ]
      
      expectedFocusOrder.forEach((selector, index) => {
        cy.realPress('Tab')
        cy.focused().should('match', selector)
        
        // 포커스 시각적 표시 확인
        cy.focused().should('have.css', 'outline-style', 'solid')
      })
    })
    
    it('모달 포커스 트랩', { tags: ['@a11y', '@focus-trap'] }, () => {
      cy.visit('/projects/project-123')
      
      // 팀 초대 모달 열기
      cy.get('[data-testid="invite-team-button"]').click()
      
      // 모달이 포커스를 받았는지 확인
      cy.get('[data-testid="modal-title"]').should('be.focused')
      
      // 모달 내부에서만 Tab 이동이 가능한지 확인
      cy.realPress('Tab')
      cy.focused().should('be.within', '[data-testid="invite-modal"]')
      
      // Shift+Tab 역방향 이동
      cy.realPress(['Shift', 'Tab'])
      cy.focused().should('be.within', '[data-testid="invite-modal"]')
      
      // ESC 키로 모달 닫기
      cy.realPress('Escape')
      cy.get('[data-testid="invite-modal"]').should('not.exist')
      
      // 포커스가 모달 트리거로 복귀했는지 확인
      cy.focused().should('have.attr', 'data-testid', 'invite-team-button')
    })
    
    it('드롭다운 메뉴 키보드 접근', { tags: ['@a11y', '@dropdown'] }, () => {
      cy.visit('/dashboard')
      
      // 사용자 메뉴 드롭다운
      cy.get('[data-testid="user-menu-trigger"]').focus()
      cy.realPress('Enter')
      
      // 드롭다운이 열렸는지 확인
      cy.get('[data-testid="user-dropdown"]').should('be.visible')
      
      // 화살표 키로 이동
      cy.realPress('ArrowDown')
      cy.focused().should('have.attr', 'data-testid', 'dropdown-profile')
      
      cy.realPress('ArrowDown')
      cy.focused().should('have.attr', 'data-testid', 'dropdown-settings')
      
      cy.realPress('ArrowUp')
      cy.focused().should('have.attr', 'data-testid', 'dropdown-profile')
      
      // Enter로 선택
      cy.realPress('Enter')
      cy.url().should('include', '/profile')
    })
  })
  
  describe('스크린 리더 호환성', () => {
    it('ARIA 레이블 및 설명 검증', { tags: ['@a11y', '@screen-reader'] }, () => {
      cy.login(testUser.email, testUser.password)
      cy.visit('/video-planning/new')
      
      // 폼 요소 ARIA 레이블 확인
      cy.get('[data-testid="story-input-textarea"]')
        .should('have.attr', 'aria-label')
        .and('include', '스토리')
      
      cy.get('[data-testid="tone-selector"]')
        .should('have.attr', 'aria-describedby')
      
      // 에러 메시지 ARIA 연결 확인
      cy.get('[data-testid="story-input-textarea"]').clear()
      cy.get('[data-testid="generate-structure-button"]').click()
      
      cy.get('[data-testid="story-required-error"]')
        .should('have.attr', 'role', 'alert')
        .and('have.attr', 'aria-live', 'polite')
    })
    
    it('동적 콘텐츠 알림', { tags: ['@a11y', '@live-regions'] }, () => {
      cy.login(testUser.email, testUser.password)
      cy.visit('/feedback/test-video-123')
      
      // 실시간 댓글 추가 시 스크린 리더 알림
      cy.addTimecodeComment({
        timecode: '00:01:00',
        comment: '접근성 테스트 댓글',
        category: 'general'
      })
      
      // Live region이 업데이트되었는지 확인
      cy.get('[data-testid="comments-live-region"]')
        .should('have.attr', 'aria-live', 'polite')
        .and('contain', '새로운 댓글이 추가되었습니다')
    })
    
    it('페이지 제목 및 헤딩 구조', { tags: ['@a11y', '@heading-structure'] }, () => {
      const pages = [
        { path: '/dashboard', expectedTitle: 'VLANET - 대시보드', mainHeading: '대시보드' },
        { path: '/projects', expectedTitle: 'VLANET - 프로젝트', mainHeading: '프로젝트' },
        { path: '/video-planning', expectedTitle: 'VLANET - AI 비디오 기획', mainHeading: 'AI 비디오 기획' }
      ]
      
      cy.login(testUser.email, testUser.password)
      
      pages.forEach((page) => {
        cy.visit(page.path)
        
        // 페이지 제목 확인
        cy.title().should('eq', page.expectedTitle)
        
        // H1 헤딩 존재 및 내용 확인
        cy.get('h1')
          .should('exist')
          .and('be.visible')
          .and('contain', page.mainHeading)
        
        // 헤딩 계층 구조 확인 (H1 > H2 > H3 순서)
        cy.get('h1, h2, h3, h4, h5, h6').then(($headings) => {
          const headings = Array.from($headings).map(h => parseInt(h.tagName[1]))
          let currentLevel = 0
          
          headings.forEach((level) => {
            expect(level).to.be.at.most(currentLevel + 1, '헤딩 레벨이 올바른 순서가 아닙니다')
            currentLevel = level
          })
        })
      })
    })
  })
  
  describe('색상 및 시각적 접근성', () => {
    it('색상 대비 비율 검증', { tags: ['@a11y', '@color-contrast'] }, () => {
      cy.visit('/')
      
      // 다크모드/라이트모드별 색상 대비 테스트
      const themes = ['light', 'dark']
      
      themes.forEach((theme) => {
        // 테마 전환
        if (theme === 'dark') {
          cy.get('[data-testid="theme-toggle"]').click()
        }
        
        // 주요 텍스트 요소들의 색상 대비 확인
        const textElements = [
          '[data-testid="main-heading"]',
          '[data-testid="primary-button"]',
          '[data-testid="secondary-button"]',
          '[data-testid="nav-link"]',
          '[data-testid="body-text"]'
        ]
        
        textElements.forEach((selector) => {
          cy.get(selector).then(($el) => {
            const element = $el[0]
            const styles = window.getComputedStyle(element)
            const color = styles.color
            const backgroundColor = styles.backgroundColor
            
            // 색상 대비 계산 (실제 구현에서는 색상 대비 계산 라이브러리 사용)
            cy.task('log', `${selector} in ${theme} mode - Color: ${color}, Background: ${backgroundColor}`)
          })
        })
        
        cy.checkA11y(null, {
          rules: {
            'color-contrast': { enabled: true }
          }
        })
        
        cy.percySnapshot(`색상 대비 검증 - ${theme} 테마`)
      })
    })
    
    it('포커스 표시기 시인성', { tags: ['@a11y', '@focus-indicators'] }, () => {
      cy.visit('/auth/login')
      
      const interactiveElements = [
        '[data-testid="email-input"]',
        '[data-testid="password-input"]',
        '[data-testid="login-button"]',
        '[data-testid="signup-link"]'
      ]
      
      interactiveElements.forEach((selector) => {
        cy.get(selector).focus()
        
        // 포커스 표시기 스타일 확인
        cy.focused()
          .should('have.css', 'outline-width')
          .and('not.eq', '0px')
        
        cy.focused()
          .should('have.css', 'outline-style')
          .and('eq', 'solid')
        
        // 포커스 표시기 색상 확인 (배경과 충분한 대비)
        cy.focused().then(($el) => {
          const outlineColor = window.getComputedStyle($el[0]).outlineColor
          expect(outlineColor).to.not.eq('rgba(0, 0, 0, 0)') // 투명하지 않음
        })
      })
    })
    
    it('텍스트 크기 조정 대응', { tags: ['@a11y', '@text-scaling'] }, () => {
      // 200% 텍스트 확대 시뮬레이션
      cy.visit('/dashboard')
      
      // CSS 변환을 통한 텍스트 크기 확대
      cy.get('html').invoke('attr', 'style', 'font-size: 200% !important')
      
      // 레이아웃이 깨지지 않는지 확인
      cy.get('[data-testid="main-navigation"]').should('be.visible')
      cy.get('[data-testid="dashboard-content"]').should('be.visible')
      
      // 텍스트가 잘리지 않는지 확인
      cy.get('[data-testid="project-card"] h3').each(($heading) => {
        cy.wrap($heading)
          .should('be.visible')
          .and('not.have.css', 'text-overflow', 'ellipsis')
      })
      
      cy.percySnapshot('200% 텍스트 확대 상태')
    })
  })
  
  describe('모바일 접근성', () => {
    it('터치 타겟 크기', { tags: ['@a11y', '@mobile', '@touch-targets'] }, () => {
      cy.viewport(375, 667) // iPhone SE
      cy.visit('/dashboard')
      
      // 44px 이상의 터치 타겟 크기 확인 (WCAG 권장사항)
      const touchTargets = [
        '[data-testid="mobile-menu-toggle"]',
        '[data-testid="notification-bell"]',
        '[data-testid="project-card"] button',
        '[data-testid="quick-action-button"]'
      ]
      
      touchTargets.forEach((selector) => {
        cy.get(selector).then(($el) => {
          const { width, height } = $el[0].getBoundingClientRect()
          expect(width).to.be.at.least(44, `${selector}의 터치 영역이 너무 작습니다 (폭: ${width}px)`)
          expect(height).to.be.at.least(44, `${selector}의 터치 영역이 너무 작습니다 (높이: ${height}px)`)
        })
      })
    })
    
    it('모바일 스크린 리더 호환성', { tags: ['@a11y', '@mobile'] }, () => {
      cy.viewport(375, 667)
      cy.login(testUser.email, testUser.password)
      cy.visit('/projects')
      
      // 모바일 내비게이션 ARIA 속성
      cy.get('[data-testid="mobile-nav-drawer"]')
        .should('have.attr', 'role', 'navigation')
        .and('have.attr', 'aria-label', '주요 내비게이션')
      
      // 스와이프 동작 대체 버튼 제공
      cy.get('[data-testid="prev-project-button"]')
        .should('exist')
        .and('have.attr', 'aria-label', '이전 프로젝트')
      
      cy.get('[data-testid="next-project-button"]')
        .should('exist')
        .and('have.attr', 'aria-label', '다음 프로젝트')
    })
  })
  
  after(() => {
    // 접근성 테스트 보고서 생성
    cy.task('log', '접근성 테스트 완료 - WCAG 2.1 AA 준수 검증 완료')
  })
})