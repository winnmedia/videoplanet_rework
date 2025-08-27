/**
 * VideoPlanet E2E User Journey Tests
 * 배포된 시스템의 핵심 사용자 여정 검증
 */

import { test, expect } from '@playwright/test'

const FRONTEND_URL = 'https://vridge-web.vercel.app'
const BACKEND_URL = 'https://api.vlanet.net'

// 테스트 데이터
const TEST_USER = {
  email: 'test@vlanet.net',
  password: 'testpass123',
  nickname: 'E2E테스터'
}

test.describe('VideoPlanet 핵심 사용자 여정', () => {
  
  // 여정 1: 인증 시스템
  test.describe('1. 인증 여정', () => {
    test('회원가입 → 로그인 → 로그아웃 완전 플로우', async ({ page }) => {
      // Given: 사용자가 랜딩 페이지에 접근
      await page.goto(FRONTEND_URL)
      
      // When: 회원가입 버튼 클릭
      await page.click('[data-testid="signup-button"]')
      
      // Then: 회원가입 폼이 표시됨
      await expect(page.locator('[data-testid="signup-form"]')).toBeVisible()
      
      // When: 회원가입 정보 입력 및 제출
      await page.fill('[name="email"]', TEST_USER.email)
      await page.fill('[name="nickname"]', TEST_USER.nickname)  
      await page.fill('[name="password"]', TEST_USER.password)
      await page.click('[type="submit"]')
      
      // Then: 대시보드로 리다이렉트
      await expect(page).toHaveURL(new RegExp('/dashboard'))
      
      // When: 로그아웃 실행
      await page.click('[data-testid="logout-button"]')
      
      // Then: 로그인 페이지로 리다이렉트
      await expect(page).toHaveURL(new RegExp('/login'))
      
      // When: 로그인 재시도
      await page.fill('[name="email"]', TEST_USER.email)
      await page.fill('[name="password"]', TEST_USER.password)
      await page.click('[type="submit"]')
      
      // Then: 대시보드 재진입 성공
      await expect(page).toHaveURL(new RegExp('/dashboard'))
    })

    test('소셜 로그인 버튼 존재 및 접근성 검증', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      
      // 카카오 로그인 버튼
      const kakaoButton = page.locator('[data-testid="kakao-login"]')
      await expect(kakaoButton).toBeVisible()
      await expect(kakaoButton).toHaveAttribute('aria-label', '카카오로 로그인')
      
      // 네이버 로그인 버튼  
      const naverButton = page.locator('[data-testid="naver-login"]')
      await expect(naverButton).toBeVisible()
      await expect(naverButton).toHaveAttribute('aria-label', '네이버로 로그인')
      
      // 구글 로그인 버튼
      const googleButton = page.locator('[data-testid="google-login"]')
      await expect(googleButton).toBeVisible()
      await expect(googleButton).toHaveAttribute('aria-label', '구글로 로그인')
    })
  })

  // 여정 2: 대시보드 상호작용
  test.describe('2. 대시보드 여정', () => {
    test.beforeEach(async ({ page }) => {
      // 로그인 상태로 시작
      await page.goto(`${FRONTEND_URL}/login`)
      await page.fill('[name="email"]', TEST_USER.email)
      await page.fill('[name="password"]', TEST_USER.password)
      await page.click('[type="submit"]')
      await page.waitForURL(new RegExp('/dashboard'))
    })

    test('대시보드 주요 위젯 렌더링 및 상호작용', async ({ page }) => {
      // Given: 대시보드 페이지 로드 완료
      await expect(page.locator('[data-testid="dashboard-widget"]')).toBeVisible()
      
      // When: 프로젝트 상태 카드 확인
      const projectCard = page.locator('[data-testid="project-status-card"]')
      await expect(projectCard).toBeVisible()
      
      // Then: 프로젝트 진행률 표시
      await expect(page.locator('[data-testid="project-progress"]')).toBeVisible()
      
      // When: 최근 활동 피드 확인
      const activityFeed = page.locator('[data-testid="recent-activity-feed"]')
      await expect(activityFeed).toBeVisible()
      
      // When: 빠른 작업 버튼 클릭
      await page.click('[data-testid="quick-create-project"]')
      
      // Then: 프로젝트 생성 페이지로 이동
      await expect(page).toHaveURL(new RegExp('/projects/create'))
    })

    test('사이드바 네비게이션 완전 테스트', async ({ page }) => {
      // When: 각 네비게이션 메뉴 클릭 테스트
      const navItems = [
        { selector: '[data-testid="nav-dashboard"]', url: '/dashboard' },
        { selector: '[data-testid="nav-projects"]', url: '/projects' },
        { selector: '[data-testid="nav-calendar"]', url: '/calendar' },
        { selector: '[data-testid="nav-feedback"]', url: '/feedback' }
      ]
      
      for (const item of navItems) {
        await page.click(item.selector)
        await expect(page).toHaveURL(new RegExp(item.url))
        
        // 활성 상태 스타일 확인
        await expect(page.locator(item.selector)).toHaveClass(/active/)
      }
    })
  })

  // 여정 3: 프로젝트 관리
  test.describe('3. 프로젝트 관리 여정', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.fill('[name="email"]', TEST_USER.email)
      await page.fill('[name="password"]', TEST_USER.password)
      await page.click('[type="submit"]')
      await page.waitForURL(new RegExp('/dashboard'))
    })

    test('프로젝트 생성 마법사 3단계 플로우', async ({ page }) => {
      // Given: 프로젝트 생성 페이지 접근
      await page.goto(`${FRONTEND_URL}/projects/create`)
      
      // Step 1: 기본 정보
      await page.fill('[name="title"]', 'E2E 테스트 프로젝트')
      await page.fill('[name="description"]', '자동화 테스트로 생성된 프로젝트입니다.')
      await page.selectOption('[name="priority"]', 'high')
      await page.click('[data-testid="next-step"]')
      
      // Step 2: 일정 설정
      await page.fill('[name="startDate"]', '2025-09-01')
      await page.fill('[name="endDate"]', '2025-12-31')
      await page.fill('[name="estimatedHours"]', '160')
      await page.click('[data-testid="next-step"]')
      
      // Step 3: 팀 구성
      await page.fill('[name="teamMemberEmail"]', 'teammate@vlanet.net')
      await page.selectOption('[name="role"]', 'editor')
      await page.click('[data-testid="add-member"]')
      
      // 프로젝트 생성 완료
      await page.click('[data-testid="create-project"]')
      
      // Then: 생성된 프로젝트 페이지로 이동
      await expect(page).toHaveURL(new RegExp('/projects/\\d+/view'))
      await expect(page.locator('h1')).toContainText('E2E 테스트 프로젝트')
    })

    test('프로젝트 목록 필터링 및 검색', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/projects`)
      
      // When: 상태별 필터 적용
      await page.click('[data-testid="filter-status"]')
      await page.click('[data-value="shooting"]')
      
      // Then: 촬영 중 프로젝트만 표시
      const projectCards = page.locator('[data-testid="project-card"]')
      await expect(projectCards.first()).toContainText('촬영 중')
      
      // When: 검색 기능 사용
      await page.fill('[data-testid="project-search"]', 'E2E 테스트')
      await page.keyboard.press('Enter')
      
      // Then: 검색 결과 표시
      await expect(page.locator('[data-testid="search-results"]')).toContainText('1개의 결과')
    })
  })

  // 여정 4: 캘린더 시스템
  test.describe('4. 캘린더 여정', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.fill('[name="email"]', TEST_USER.email)
      await page.fill('[name="password"]', TEST_USER.password)
      await page.click('[type="submit"]')
      await page.waitForURL(new RegExp('/dashboard'))
      await page.goto(`${FRONTEND_URL}/calendar`)
    })

    test('일정 생성 및 충돌 감지', async ({ page }) => {
      // When: 새 일정 생성
      await page.click('[data-testid="create-schedule"]')
      
      // Given: 일정 정보 입력
      await page.fill('[name="title"]', '촬영 스케줄')
      await page.fill('[name="startTime"]', '2025-09-15T09:00')
      await page.fill('[name="endTime"]', '2025-09-15T18:00')
      await page.fill('[name="location"]', '스튜디오 A')
      
      // When: 저장 시도
      await page.click('[data-testid="save-schedule"]')
      
      // Then: 일정이 캘린더에 표시됨
      await expect(page.locator('[data-testid="schedule-item"]')).toContainText('촬영 스케줄')
      
      // When: 겹치는 시간에 새 일정 생성 시도
      await page.click('[data-testid="create-schedule"]')
      await page.fill('[name="title"]', '편집 미팅')
      await page.fill('[name="startTime"]', '2025-09-15T14:00')
      await page.fill('[name="endTime"]', '2025-09-15T16:00')
      await page.click('[data-testid="save-schedule"]')
      
      // Then: 충돌 경고 표시
      await expect(page.locator('[data-testid="conflict-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="conflict-warning"]')).toContainText('기존 일정과 겹침')
    })

    test('캘린더 뷰 전환 및 네비게이션', async ({ page }) => {
      // When: 월간 뷰에서 주간 뷰로 전환
      await page.click('[data-testid="view-week"]')
      await expect(page.locator('[data-testid="week-view"]')).toBeVisible()
      
      // When: 주간 뷰에서 일간 뷰로 전환
      await page.click('[data-testid="view-day"]')
      await expect(page.locator('[data-testid="day-view"]')).toBeVisible()
      
      // When: 날짜 네비게이션
      await page.click('[data-testid="prev-period"]')
      await page.click('[data-testid="next-period"]')
      await page.click('[data-testid="today"]')
      
      // Then: 오늘 날짜로 이동
      const today = new Date().toISOString().split('T')[0]
      await expect(page.locator('[data-testid="current-date"]')).toContainText(today)
    })
  })

  // 여정 5: 비디오 피드백 시스템  
  test.describe('5. 비디오 피드백 여정', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`)
      await page.fill('[name="email"]', TEST_USER.email)
      await page.fill('[name="password"]', TEST_USER.password)
      await page.click('[type="submit"]')
      await page.waitForURL(new RegExp('/dashboard'))
      await page.goto(`${FRONTEND_URL}/feedback`)
    })

    test('비디오 플레이어 및 타임코드 댓글 시스템', async ({ page }) => {
      // Given: 피드백 페이지에서 비디오 선택
      await page.click('[data-testid="video-item"]:first-child')
      
      // When: 비디오 플레이어 로드 확인
      const videoPlayer = page.locator('[data-testid="video-player"]')
      await expect(videoPlayer).toBeVisible()
      
      // When: 특정 시점(30초)으로 이동하여 댓글 작성
      await page.click('[data-testid="seek-30s"]')
      await page.click('[data-testid="add-comment"]')
      
      // Then: 댓글 폼 표시
      await expect(page.locator('[data-testid="comment-form"]')).toBeVisible()
      
      // When: 댓글 내용 입력 및 저장
      await page.fill('[data-testid="comment-text"]', '30초 지점에서 색보정이 필요해 보입니다.')
      await page.click('[data-testid="save-comment"]')
      
      // Then: 타임코드 댓글이 타임라인에 표시
      const timelineComment = page.locator('[data-testid="timeline-comment"][data-timestamp="30"]')
      await expect(timelineComment).toBeVisible()
      await expect(timelineComment).toContainText('색보정이 필요')
      
      // When: 댓글 마커 클릭
      await page.click('[data-testid="comment-marker"][data-timestamp="30"]')
      
      // Then: 비디오가 해당 시점으로 이동
      await expect(page.locator('[data-testid="current-time"]')).toContainText('00:30')
    })

    test('피드백 상태 관리 및 승인 프로세스', async ({ page }) => {
      // Given: 댓글이 있는 비디오 선택
      await page.click('[data-testid="video-with-comments"]')
      
      // When: 미해결 댓글 필터 적용
      await page.click('[data-testid="filter-unresolved"]')
      
      // Then: 미해결 댓글만 표시
      const unresolvedComments = page.locator('[data-testid="comment-item"][data-status="unresolved"]')
      await expect(unresolvedComments).toHaveCount(3)
      
      // When: 댓글을 해결됨으로 표시
      await page.click('[data-testid="resolve-comment"]:first-child')
      
      // Then: 댓글 상태가 변경됨
      await expect(page.locator('[data-testid="comment-item"]:first-child')).toHaveAttribute('data-status', 'resolved')
      
      // When: 전체 피드백 승인
      await page.click('[data-testid="approve-feedback"]')
      
      // Then: 승인 확인 모달 표시
      await expect(page.locator('[data-testid="approval-modal"]')).toBeVisible()
      await page.click('[data-testid="confirm-approval"]')
      
      // Then: 비디오 상태가 승인됨으로 변경
      await expect(page.locator('[data-testid="video-status"]')).toContainText('승인됨')
    })
  })

  // 접근성 여정
  test.describe('6. 접근성 여정', () => {
    test('키보드 네비게이션 완전 테스트', async ({ page }) => {
      await page.goto(FRONTEND_URL)
      
      // Tab 네비게이션으로 모든 인터랙티브 요소 접근
      await page.keyboard.press('Tab') // 로그인 버튼
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'login-button')
      
      await page.keyboard.press('Tab') // 회원가입 버튼  
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'signup-button')
      
      // Enter 키로 버튼 활성화
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(new RegExp('/signup'))
      
      // 폼 필드 간 Tab 이동
      await page.keyboard.press('Tab') // 이메일 필드
      await expect(page.locator(':focus')).toHaveAttribute('name', 'email')
      
      await page.keyboard.press('Tab') // 닉네임 필드
      await expect(page.locator(':focus')).toHaveAttribute('name', 'nickname')
    })

    test('스크린 리더 호환성 검증', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/dashboard`)
      
      // ARIA 레이블 확인
      const mainContent = page.locator('main')
      await expect(mainContent).toHaveAttribute('aria-label', '메인 콘텐츠')
      
      // 헤딩 구조 확인
      const h1 = page.locator('h1')
      await expect(h1).toBeVisible()
      
      // 네비게이션 역할 확인
      const nav = page.locator('nav')
      await expect(nav).toHaveAttribute('role', 'navigation')
      await expect(nav).toHaveAttribute('aria-label', '메인 네비게이션')
      
      // 상태 메시지 확인
      const statusMessages = page.locator('[aria-live="polite"]')
      await expect(statusMessages).toBeVisible()
    })
  })

  // 에러 복구 여정
  test.describe('7. 에러 복구 여정', () => {
    test('네트워크 오류 시 복구 메커니즘', async ({ page }) => {
      // 네트워크 차단
      await page.route('**/*', route => route.abort())
      
      await page.goto(FRONTEND_URL)
      
      // 오프라인 상태 메시지 확인
      await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible()
      await expect(page.locator('[data-testid="offline-banner"]')).toContainText('인터넷 연결을 확인해주세요')
      
      // 네트워크 복구
      await page.unroute('**/*')
      
      // 재시도 버튼 클릭
      await page.click('[data-testid="retry-connection"]')
      
      // 정상 로딩 확인
      await expect(page.locator('[data-testid="offline-banner"]')).not.toBeVisible()
    })

    test('API 에러 처리 및 사용자 피드백', async ({ page }) => {
      // API 에러 모킹
      await page.route('**/api/**', route => 
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) })
      )
      
      await page.goto(`${FRONTEND_URL}/login`)
      await page.fill('[name="email"]', TEST_USER.email)
      await page.fill('[name="password"]', 'wrongpassword')
      await page.click('[type="submit"]')
      
      // 에러 토스트 메시지 확인
      await expect(page.locator('[data-testid="error-toast"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-toast"]')).toContainText('로그인에 실패했습니다')
      
      // 에러 메시지 자동 사라짐 확인
      await expect(page.locator('[data-testid="error-toast"]')).not.toBeVisible({ timeout: 6000 })
    })
  })
})