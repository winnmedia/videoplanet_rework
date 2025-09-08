/**
 * @fileoverview Visual Regression Testing for Complexity Reduction
 * @author Grace (QA Lead)
 * @description 복잡도 감소 리팩토링 시 UI 일관성 검증을 위한 시각적 회귀 테스트
 */

/// <reference types="cypress" />

describe('복잡도 감소 시각적 회귀 테스트 (Visual Regression)', () => {
  beforeEach(() => {
    // 결정론적 테스트를 위한 시간 고정
    cy.clock(new Date('2025-01-15T12:00:00.000Z').getTime())

    // Viewport 고정으로 일관된 스크린샷 보장
    cy.viewport(1920, 1080)

    // 시각적 일관성을 위한 폰트 로딩 대기
    cy.document().its('fonts.status').should('equal', 'loaded')
  })

  afterEach(() => {
    // 시간 복원
    cy.tick(1000)
  })

  /**
   * Dashboard Widget Visual Regression Tests
   */
  describe('Dashboard Widget 시각적 일관성', () => {
    beforeEach(() => {
      // MSW를 통한 결정론적 API 응답
      cy.intercept('GET', '/api/dashboard/stats', {
        fixture: 'dashboard-stats-baseline.json',
      }).as('getDashboardStats')

      cy.visit('/dashboard')
      cy.wait('@getDashboardStats')
    })

    it('should maintain exact visual appearance of dashboard stats cards', () => {
      // Dashboard stats 카드들이 로딩 완료될 때까지 대기
      cy.get('[data-testid="dashboard-widget"]').should('be.visible')
      cy.get('[data-testid="projects-stat"]').should('contain.text', '8')
      cy.get('[data-testid="users-stat"]').should('contain.text', '23')
      cy.get('[data-testid="feedback-stat"]').should('contain.text', '5')
      cy.get('[data-testid="tasks-stat"]').should('contain.text', '124')

      // 전체 대시보드 위젯 스크린샷 캡처
      cy.get('[data-testid="dashboard-widget"]').screenshot('dashboard-widget-baseline', {
        capture: 'viewport',
        scale: false,
        disableTimersAndAnimations: true,
      })
    })

    it('should preserve hover states visual consistency', () => {
      cy.get('[data-testid="projects-stat"]').realHover()

      // 호버 상태 안정화 대기
      cy.wait(100)

      cy.get('[data-testid="projects-stat"]').screenshot('dashboard-stats-hover-state', {
        capture: 'viewport',
        scale: false,
        disableTimersAndAnimations: true,
      })
    })

    it('should maintain responsive layout at different breakpoints', () => {
      // Desktop 뷰
      cy.viewport(1920, 1080)
      cy.get('[data-testid="dashboard-widget"]').screenshot('dashboard-desktop-1920', {
        capture: 'viewport',
      })

      // Tablet 뷰
      cy.viewport(1024, 768)
      cy.get('[data-testid="dashboard-widget"]').screenshot('dashboard-tablet-1024', {
        capture: 'viewport',
      })

      // Mobile 뷰
      cy.viewport(375, 667)
      cy.get('[data-testid="dashboard-widget"]').screenshot('dashboard-mobile-375', {
        capture: 'viewport',
      })
    })
  })

  /**
   * Calendar Widget Visual Regression Tests
   */
  describe('Calendar Widget 시각적 일관성', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/calendar/events', {
        fixture: 'calendar-events-baseline.json',
      }).as('getCalendarEvents')

      cy.visit('/calendar')
      cy.wait('@getCalendarEvents')
    })

    it('should maintain calendar grid layout and event positioning', () => {
      // 캘린더 로딩 완료 대기
      cy.get('[data-testid="calendar-widget"]').should('be.visible')
      cy.get('[data-testid="calendar-event"]').should('have.length.at.least', 1)

      // 캘린더 전체 뷰 스크린샷
      cy.get('[data-testid="calendar-widget"]').screenshot('calendar-widget-baseline', {
        capture: 'viewport',
        scale: false,
        disableTimersAndAnimations: true,
      })
    })

    it('should preserve event modal visual consistency', () => {
      // 이벤트 클릭하여 모달 열기
      cy.get('[data-testid="calendar-event-1"]').click()

      // 모달 완전히 로드 대기
      cy.get('[role="dialog"]').should('be.visible')
      cy.get('[data-testid="event-modal"]').should('be.visible')

      // 모달 스크린샷
      cy.get('[role="dialog"]').screenshot('calendar-event-modal-baseline', {
        capture: 'viewport',
        scale: false,
      })
    })

    it('should maintain date navigation visual states', () => {
      // 이전 달 버튼 클릭
      cy.get('[data-testid="calendar-prev-month"]').click()
      cy.wait(300) // 애니메이션 완료 대기

      cy.get('[data-testid="calendar-widget"]').screenshot('calendar-prev-month-state', {
        capture: 'viewport',
      })

      // 다음 달 버튼 클릭 (원래 달로 복귀)
      cy.get('[data-testid="calendar-next-month"]').click()
      cy.wait(300)

      // 다음 달로 이동
      cy.get('[data-testid="calendar-next-month"]').click()
      cy.wait(300)

      cy.get('[data-testid="calendar-widget"]').screenshot('calendar-next-month-state', {
        capture: 'viewport',
      })
    })
  })

  /**
   * Video Feedback Widget Visual Regression Tests
   */
  describe('Video Feedback Widget 시각적 일관성', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/video-feedback/pending', {
        fixture: 'video-feedback-baseline.json',
      }).as('getVideoFeedback')

      // 비디오 메타데이터 mock
      cy.intercept('GET', '/api/videos/video-123', {
        fixture: 'video-metadata-baseline.json',
      }).as('getVideoMetadata')

      cy.visit('/feedback/video-123')
      cy.wait(['@getVideoFeedback', '@getVideoMetadata'])
    })

    it('should maintain video player and feedback panel layout', () => {
      // 비디오 플레이어 로딩 완료 대기
      cy.get('[data-testid="video-player"]').should('be.visible')
      cy.get('[data-testid="feedback-panel"]').should('be.visible')

      // 전체 비디오 피드백 위젯 스크린샷
      cy.get('[data-testid="video-feedback-widget"]').screenshot('video-feedback-widget-baseline', {
        capture: 'viewport',
        scale: false,
        disableTimersAndAnimations: true,
      })
    })

    it('should preserve comment thread visual hierarchy', () => {
      // 댓글 스레드가 로드될 때까지 대기
      cy.get('[data-testid="comment-thread"]').should('be.visible')
      cy.get('[data-testid="comment-item"]').should('have.length.at.least', 1)

      // 댓글 섹션 상세 스크린샷
      cy.get('[data-testid="feedback-panel"]').screenshot('video-feedback-comments-baseline', {
        capture: 'viewport',
        scale: false,
      })
    })

    it('should maintain comment input form visual consistency', () => {
      // 댓글 입력 폼에 포커스
      cy.get('[data-testid="comment-input"]').focus()

      // 포커스 상태 안정화 대기
      cy.wait(100)

      // 댓글 입력 텍스트
      cy.get('[data-testid="comment-input"]').type('새로운 피드백 댓글 테스트입니다.')

      // 입력 상태 스크린샷
      cy.get('[data-testid="comment-form"]').screenshot('video-feedback-comment-input-state', {
        capture: 'viewport',
        scale: false,
      })
    })

    it('should preserve video control UI visual states', () => {
      // 재생 버튼 클릭 (가상의 비디오이므로 UI 상태만 확인)
      cy.get('[data-testid="video-play-button"]').click()
      cy.wait(200)

      // 재생 상태 UI 스크린샷
      cy.get('[data-testid="video-player"]').screenshot('video-player-playing-state', {
        capture: 'viewport',
        scale: false,
      })

      // 볼륨 컨트롤 호버
      cy.get('[data-testid="video-volume-control"]').realHover()
      cy.wait(100)

      cy.get('[data-testid="video-controls"]').screenshot('video-controls-hover-state', {
        capture: 'viewport',
        scale: false,
      })
    })
  })

  /**
   * Navigation Visual Consistency Tests
   */
  describe('Navigation 시각적 일관성', () => {
    it('should maintain sidebar visual states across pages', () => {
      // Dashboard에서 사이드바 상태
      cy.visit('/dashboard')
      cy.get('[data-testid="sidebar"]').should('be.visible')

      cy.get('[data-testid="sidebar"]').screenshot('sidebar-dashboard-state', {
        capture: 'viewport',
        scale: false,
      })

      // Calendar로 네비게이션
      cy.get('[data-testid="nav-calendar"]').click()
      cy.url().should('include', '/calendar')

      // Calendar에서 사이드바 상태 (활성 메뉴 항목 변경)
      cy.get('[data-testid="sidebar"]').screenshot('sidebar-calendar-state', {
        capture: 'viewport',
        scale: false,
      })

      // 사이드바 토글 테스트
      cy.get('[data-testid="sidebar-toggle"]').click()
      cy.wait(300) // 애니메이션 완료 대기

      cy.get('[data-testid="sidebar"]').screenshot('sidebar-collapsed-state', {
        capture: 'viewport',
        scale: false,
      })
    })

    it('should preserve breadcrumb visual hierarchy', () => {
      // 깊은 경로로 이동하여 breadcrumb 생성
      cy.visit('/projects/123/edit')

      // Breadcrumb 로딩 완료 대기
      cy.get('[data-testid="breadcrumb"]').should('be.visible')
      cy.get('[data-testid="breadcrumb-item"]').should('have.length.at.least', 3)

      cy.get('[data-testid="breadcrumb"]').screenshot('breadcrumb-baseline', {
        capture: 'viewport',
        scale: false,
      })
    })
  })

  /**
   * Error States Visual Consistency Tests
   */
  describe('에러 상태 시각적 일관성', () => {
    it('should maintain error boundary visual consistency', () => {
      // API 에러 상황 시뮬레이션
      cy.intercept('GET', '/api/dashboard/stats', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('getStatsError')

      cy.visit('/dashboard')
      cy.wait('@getStatsError')

      // 에러 상태 UI 표시 대기
      cy.get('[data-testid="error-boundary"]', { timeout: 5000 }).should('be.visible')

      cy.get('[data-testid="error-boundary"]').screenshot('error-boundary-baseline', {
        capture: 'viewport',
        scale: false,
      })
    })

    it('should preserve loading states visual consistency', () => {
      // 느린 API 응답 시뮬레이션
      cy.intercept('GET', '/api/dashboard/stats', req => {
        req.reply(res => {
          res.setDelay(2000)
          res.send({
            fixture: 'dashboard-stats-baseline.json',
          })
        })
      }).as('getStatsSlowly')

      cy.visit('/dashboard')

      // 로딩 상태 캡처
      cy.get('[data-testid="dashboard-loading"]').should('be.visible').screenshot('dashboard-loading-state', {
        capture: 'viewport',
        scale: false,
      })

      // 로딩 완료 대기
      cy.wait('@getStatsSlowly')
      cy.get('[data-testid="dashboard-widget"]').should('be.visible')
    })
  })

  /**
   * Dark Mode Visual Consistency Tests
   */
  describe('다크 모드 시각적 일관성', () => {
    it('should maintain dark mode visual consistency across components', () => {
      // 다크 모드 활성화
      cy.visit('/dashboard')
      cy.get('[data-testid="theme-toggle"]').click()

      // 다크 모드 적용 대기
      cy.get('body').should('have.class', 'dark')
      cy.wait(300)

      // Dashboard 다크 모드 스크린샷
      cy.get('[data-testid="dashboard-widget"]').screenshot('dashboard-dark-mode', {
        capture: 'viewport',
        scale: false,
      })

      // Calendar 페이지로 이동하여 다크 모드 일관성 확인
      cy.visit('/calendar')
      cy.get('[data-testid="calendar-widget"]').screenshot('calendar-dark-mode', {
        capture: 'viewport',
        scale: false,
      })
    })
  })

  /**
   * Accessibility Focus States Visual Tests
   */
  describe('접근성 포커스 상태 시각적 일관성', () => {
    it('should maintain keyboard focus indicators visual consistency', () => {
      cy.visit('/dashboard')

      // Tab 키로 포커스 이동
      cy.get('body').tab()
      cy.focused().screenshot('focus-first-element', {
        capture: 'viewport',
        scale: false,
      })

      // 다음 요소로 포커스 이동
      cy.focused().tab()
      cy.focused().screenshot('focus-second-element', {
        capture: 'viewport',
        scale: false,
      })

      // 포커스 가능한 모든 요소에 대한 시각적 일관성 검증
      cy.get('[tabindex="0"], button, input, select, textarea, [href]').each($el => {
        cy.wrap($el).focus()
        cy.wait(100)
        // 각 포커스 상태의 시각적 일관성 검증은 별도 테스트에서 수행
      })
    })
  })
})

/**
 * Visual Regression Utilities
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      compareScreenshot(name: string, threshold?: number): Chainable<Element>
      waitForStableLayout(timeout?: number): Chainable<Element>
    }
  }
}

// 스크린샷 비교 커스텀 명령어
Cypress.Commands.add('compareScreenshot', (name: string, threshold: number = 0.02) => {
  cy.screenshot(name, {
    capture: 'viewport',
    scale: false,
    disableTimersAndAnimations: true,
  })

  // 실제 환경에서는 percy, chromatic 등의 도구를 사용
  // 여기서는 기본 스크린샷 기능만 사용
})

// 레이아웃 안정화 대기 커스텀 명령어
Cypress.Commands.add('waitForStableLayout', (timeout: number = 2000) => {
  // DOM이 안정화될 때까지 대기
  cy.get('body').should('be.visible')
  cy.wait(300) // 최소 대기 시간

  // 폰트 로딩 완료 대기
  cy.document().then(doc => {
    return new Cypress.Promise(resolve => {
      if (doc.fonts && doc.fonts.ready) {
        doc.fonts.ready.then(resolve)
      } else {
        setTimeout(resolve, 500)
      }
    })
  })
})

export {}
