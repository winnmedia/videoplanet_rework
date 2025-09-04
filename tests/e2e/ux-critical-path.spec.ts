/**
 * UX 중요 사용자 여정 테스트
 * Product Owner 분석 기반 핵심 시나리오 검증
 */

import { test, expect } from '@playwright/test'

test.describe('핵심 사용자 여정 - UX 검증', () => {
  
  test.beforeEach(async ({ page }) => {
    // 로그인 상태 설정 (실제 구현에 따라 조정)
    await page.goto('/')
    // TODO: 실제 인증 로직으로 대체
    await page.evaluate(() => {
      localStorage.setItem('VGID', 'mock-token')
    })
  })

  test('사용자 여정 1: 프로젝트 생성에서 팀원 초대까지', async ({ page }) => {
    await test.step('대시보드 접속 및 기본 상태 확인', async () => {
      await page.goto('/dashboard')
      await expect(page.locator('h1')).toContainText('대시보드')
      
      // 사이드바 정상 표시 확인
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    })

    await test.step('프로젝트 관리 메뉴 접근 및 서브메뉴 동작 검증', async () => {
      // 프로젝트 메뉴 클릭
      await page.locator('[data-testid="menu-projects"]').click()
      
      // 서브메뉴 표시 확인 (현재 문제점)
      const subMenu = page.locator('[data-testid="sidebar-submenu"]')
      await expect(subMenu).toBeVisible({ timeout: 2000 })
      
      // 서브메뉴 위치 검증 - 메인 콘텐츠를 가리지 않아야 함
      const mainContent = page.locator('main.main-content')
      const subMenuBox = await subMenu.boundingBox()
      const mainContentBox = await mainContent.boundingBox()
      
      if (subMenuBox && mainContentBox) {
        expect(subMenuBox.x + subMenuBox.width).toBeLessThanOrEqual(mainContentBox.x)
      }
    })

    await test.step('새 프로젝트 생성', async () => {
      await page.goto('/projects')
      await expect(page.locator('[data-testid="create-project-button"]')).toBeVisible()
      await page.locator('[data-testid="create-project-button"]').click()
      
      await page.goto('/projects/create')
      
      // 자동 일정 프리뷰 카드 확인 (DEVPLAN 요구사항)
      const autoSchedulePreview = page.locator('[data-testid="auto-schedule-preview"]')
      await expect(autoSchedulePreview).toBeVisible()
      
      // 기획 1주, 촬영 1일, 편집 2주 기본값 확인
      await expect(page.locator('[data-testid="planning-duration"]')).toContainText('1주')
      await expect(page.locator('[data-testid="shooting-duration"]')).toContainText('1일') 
      await expect(page.locator('[data-testid="editing-duration"]')).toContainText('2주')
    })
  })

  test('사용자 여정 2: 영상 기획 위저드 3단계 완주', async ({ page }) => {
    await test.step('영상 기획 페이지 접근', async () => {
      await page.goto('/planning')
      await expect(page.locator('h1')).toContainText('영상 기획')
      
      // 전문적인 UI 요소 확인
      await expect(page.locator('[data-testid="planning-wizard"]')).toBeVisible()
    })

    await test.step('STEP 1: 기본 정보 입력 및 프리셋 기능', async () => {
      // 프리셋 버튼 확인
      const presetButtons = page.locator('[data-testid*="preset-"]')
      await expect(presetButtons.first()).toBeVisible()
      
      // 브랜드30초 프리셋 클릭
      await page.locator('[data-testid="preset-brand-30s"]').click()
      
      // 자동 채움 확인
      await expect(page.locator('[data-testid="duration-select"]')).toHaveValue('30')
      await expect(page.locator('[data-testid="tone-select"]')).not.toBeEmpty()
      
      // LLM 호출 버튼
      await page.locator('[data-testid="generate-4steps"]').click()
      
      // 로딩 상태 확인
      await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible()
    })

    await test.step('STEP 2: 4단계 검토/수정', async () => {
      // 4단계 카드 표시 대기
      await page.waitForSelector('[data-testid="step-cards"]', { timeout: 10000 })
      
      const stepCards = page.locator('[data-testid*="step-card-"]')
      await expect(stepCards).toHaveCount(4)
      
      // 인라인 편집 기능 확인
      await stepCards.first().locator('[data-testid="edit-button"]').click()
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible()
      
      // 12숏 생성 버튼
      await page.locator('[data-testid="generate-12shots"]').click()
    })

    await test.step('STEP 3: 12숏 편집 및 콘티/인서트', async () => {
      // 12개 숏 카드 확인
      const shotCards = page.locator('[data-testid*="shot-card-"]')
      await expect(shotCards).toHaveCount(12)
      
      // 콘티 생성 기능
      await shotCards.first().locator('[data-testid="generate-storyboard"]').click()
      await expect(page.locator('[data-testid="storyboard-image"]')).toBeVisible()
      
      // 인서트 3컷 추천
      await expect(page.locator('[data-testid="insert-recommendations"]')).toBeVisible()
      const insertChips = page.locator('[data-testid*="insert-chip-"]')
      await expect(insertChips).toHaveCount(3)
      
      // 다운로드 기능
      await page.locator('[data-testid="export-button"]').click()
      await expect(page.locator('[data-testid="export-modal"]')).toBeVisible()
    })
  })

  test('사용자 여정 3: 영상 피드백 타임코드 기반 협업', async ({ page }) => {
    await test.step('피드백 페이지 접근 및 영상 플레이어', async () => {
      await page.goto('/feedback')
      
      // 특정 피드백 프로젝트 선택 (Mock 데이터 기준)
      await page.locator('[data-testid*="feedback-item-"]').first().click()
      
      // 좌우 레이아웃 확인
      await expect(page.locator('[data-testid="video-player-section"]')).toBeVisible()
      await expect(page.locator('[data-testid="feedback-tabs-section"]')).toBeVisible()
    })

    await test.step('타임코드 자동 반영 기능', async () => {
      // 영상 재생 위치 설정
      await page.locator('[data-testid="video-player"]').click()
      await page.keyboard.press('Space') // 재생/일시정지
      
      // 현재 시점 코멘트 버튼 클릭
      await page.locator('[data-testid="timecode-comment"]').click()
      
      // 타임코드 자동 삽입 확인
      const commentInput = page.locator('[data-testid="comment-input"]')
      const inputValue = await commentInput.inputValue()
      expect(inputValue).toMatch(/^\[[\d]{2}:[\d]{2}\.[\d]{3}\]/)
    })

    await test.step('스크린샷 및 첨부 기능', async () => {
      // 스크린샷 버튼 클릭
      await page.locator('[data-testid="screenshot-button"]').click()
      
      // 파일명 규칙 검증을 위한 다운로드 이벤트 감시
      const downloadPromise = page.waitForEvent('download')
      await page.locator('[data-testid="save-screenshot"]').click()
      const download = await downloadPromise
      
      // 파일명 규칙: project-{slug}_TC{mmssfff}_{YYYY-MM-DD}T{HHmmss}.jpg
      const filename = download.suggestedFilename()
      expect(filename).toMatch(/^project-[\w-]+_TC\d{6}_\d{4}-\d{2}-\d{2}T\d{6}\.jpg$/)
      
      // 첨부 미리보기 확인
      await expect(page.locator('[data-testid="attachment-preview"]')).toBeVisible()
    })
  })

  test('사용자 여정 4: 캘린더 충돌 감지 및 관리', async ({ page }) => {
    await test.step('전체 일정 페이지 접근', async () => {
      await page.goto('/calendar')
      await expect(page.locator('h1')).toContainText('전체 일정')
    })

    await test.step('프로젝트별 색상 범례 확인', async () => {
      // 우상단 범례 고정 영역
      const legend = page.locator('[data-testid="project-legend"]')
      await expect(legend).toBeVisible()
      
      // 수평 스크롤 동작 확인
      const legendItems = page.locator('[data-testid*="legend-item-"]')
      await expect(legendItems.first()).toBeVisible()
      
      // 전체/내 프로젝트 토글
      await page.locator('[data-testid="toggle-my-projects"]').click()
      await expect(page.locator('[data-testid="calendar-view"]')).toHaveClass(/filtered/)
    })

    await test.step('충돌만 보기 필터링', async () => {
      // '충돌만 보기' 체크박스
      await page.locator('[data-testid="conflict-only-filter"]').check()
      
      // 촬영 충돌 블록만 표시 확인
      const conflictEvents = page.locator('[data-testid*="conflict-event-"]')
      await expect(conflictEvents.first()).toBeVisible()
      
      // 시각적 경고 요소 확인
      await expect(conflictEvents.first()).toHaveClass(/border-dashed/)
      await expect(conflictEvents.first().locator('[data-testid="warning-icon"]')).toBeVisible()
      
      // 툴팁 상세 정보
      await conflictEvents.first().hover()
      await expect(page.locator('[data-testid="conflict-tooltip"]')).toBeVisible()
    })
  })

  test('접근성 및 키보드 네비게이션 검증', async ({ page }) => {
    await test.step('서브메뉴 키보드 네비게이션', async () => {
      await page.goto('/dashboard')
      
      // Tab으로 프로젝트 메뉴까지 이동
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
      
      // 서브메뉴 포커스 트랩 확인
      const subMenu = page.locator('[data-testid="sidebar-submenu"]')
      await expect(subMenu).toBeVisible()
      
      // 화살표 키로 항목 이동
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      
      // ESC로 닫기
      await page.keyboard.press('Escape')
      await expect(subMenu).not.toBeVisible()
    })

    await test.step('ARIA 속성 및 스크린 리더 지원', async () => {
      // 읽지 않음 배지의 aria-label 확인
      const unreadBadge = page.locator('[data-testid*="unread-badge"]').first()
      if (await unreadBadge.isVisible()) {
        const ariaLabel = await unreadBadge.getAttribute('aria-label')
        expect(ariaLabel).toContain('notifications')
      }
      
      // 메뉴 구조의 role 속성 확인
      await expect(page.locator('[role="navigation"]')).toBeVisible()
      await expect(page.locator('[role="menu"]')).toBeVisible()
    })
  })

  test('모바일 반응형 동작 검증', async ({ page }) => {
    await test.step('모바일 뷰포트에서 사이드바 동작', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')
      
      // 햄버거 메뉴 버튼 확인
      const hamburgerButton = page.locator('[aria-label="메뉴 토글"]')
      await expect(hamburgerButton).toBeVisible()
      
      // 사이드바 초기 상태 (collapsed)
      const sidebar = page.locator('[data-testid="sidebar"]')
      await expect(sidebar).toHaveClass(/translate-x-\[-100%\]/)
      
      // 햄버거 클릭으로 열기
      await hamburgerButton.click()
      await expect(sidebar).toHaveClass(/translate-x-0/)
      
      // 백드롭 확인 및 닫기
      const backdrop = page.locator('[data-testid="mobile-backdrop"]')
      await expect(backdrop).toBeVisible()
      await backdrop.click()
      await expect(sidebar).toHaveClass(/translate-x-\[-100%\]/)
    })
  })
})