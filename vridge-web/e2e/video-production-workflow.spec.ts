/**
 * Video Production Workflow E2E Tests
 * Phase 4 - 전체 워크플로우 검증
 */

import { test, expect } from '@playwright/test'

test.describe('Video Production Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock 인증 상태 설정
    await page.goto('/login')
    await page.fill('[aria-label="Email"]', 'test@example.com')
    await page.fill('[aria-label="Password"]', 'password')
    await page.click('button[type="submit"]')
    
    // 대시보드로 리다이렉트 확인
    await expect(page).toHaveURL('/dashboard')
  })

  test('should complete full video production workflow', async ({ page }) => {
    // 1. 프로젝트 생성
    await page.click('[aria-label="New Project"]')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    await page.fill('[name="title"]', 'E2E Test Video Project')
    await page.selectOption('[name="type"]', 'commercial')
    await page.fill('[name="description"]', 'End-to-end test project for video production workflow')
    await page.click('button:has-text("Create Project")')
    
    // 프로젝트 생성 성공 확인
    await expect(page.locator('[role="alert"]')).toHaveText(/Project created successfully/i)
    await expect(page).toHaveURL(/\/projects\/\w+/)

    // 2. Planning 단계 - VideoPlanning 위젯 연동
    await page.click('[data-testid="planning-tab"]')
    await expect(page.locator('.video-planning-widget')).toBeVisible()
    
    // 기획 카드 생성
    await page.click('[aria-label="Add Planning Card"]')
    await page.fill('[name="cardTitle"]', '컨셉 기획')
    await page.selectOption('[name="priority"]', 'high')
    await page.click('button:has-text("Add Card")')
    
    // 카드 드래그앤드롭으로 완료 상태로 이동
    const planningCard = page.locator('[data-testid="planning-card"]:has-text("컨셉 기획")')
    const completedColumn = page.locator('[data-stage="completed"]')
    await planningCard.dragTo(completedColumn)
    
    // Planning 단계 완료
    await page.click('button:has-text("Complete Planning Stage")')
    await expect(page.locator('[role="alert"]')).toHaveText(/Planning stage completed/i)

    // 3. Scripting 단계
    await page.click('[data-testid="scripting-tab"]')
    await expect(page.locator('[data-stage="scripting"]')).toHaveClass(/active/)
    
    // 대본 작성
    await page.fill('[name="scriptContent"]', 'INT. OFFICE - DAY\n\nA professional workspace with modern equipment.')
    await page.fill('[name="estimatedLength"]', '120')
    
    await page.click('button:has-text("Complete Scripting")')
    await expect(page.locator('[role="alert"]')).toHaveText(/Scripting completed/i)

    // 4. Storyboard 단계
    await page.click('[data-testid="storyboard-tab"]')
    
    // 스토리보드 씬 추가
    for (let i = 1; i <= 3; i++) {
      await page.click('[aria-label="Add Scene"]')
      await page.fill(`[name="scene-${i}-description"]`, `Scene ${i}: Professional workspace shot`)
      await page.selectOption(`[name="scene-${i}-type"]`, 'wide')
    }
    
    await page.fill('[name="totalScenes"]', '3')
    await page.click('button:has-text("Complete Storyboard")')

    // 5. Shooting 단계
    await page.click('[data-testid="shooting-tab"]')
    
    // 촬영 진행률 업데이트
    await page.fill('[name="footageHours"]', '4')
    await page.selectOption('[name="shootingStatus"]', 'completed')
    await page.click('button:has-text("Complete Shooting")')

    // 6. Editing 단계
    await page.click('[data-testid="editing-tab"]')
    
    // 편집 정보 입력
    await page.fill('[name="totalCuts"]', '45')
    await page.fill('[name="finalDuration"]', '90')
    await page.selectOption('[name="editingStatus"]', 'completed')
    await page.click('button:has-text("Complete Editing")')

    // 7. Post-Production 단계
    await page.click('[data-testid="post-production-tab"]')
    
    await page.fill('[name="effectsCount"]', '12')
    await page.check('[name="audioMixed"]')
    await page.selectOption('[name="colorGrading"]', 'completed')
    await page.click('button:has-text("Complete Post-Production")')

    // 8. Review 단계 - VideoFeedback 위젯 연동
    await page.click('[data-testid="review-tab"]')
    await expect(page.locator('.video-feedback-widget')).toBeVisible()
    
    // 비디오 피드백 추가
    await page.click('[aria-label="Add Feedback"]')
    await page.fill('[name="timestamp"]', '00:01:23')
    await page.fill('[name="comment"]', 'Color correction needed in this scene')
    await page.selectOption('[name="priority"]', 'medium')
    await page.click('button:has-text("Submit Feedback")')
    
    // 피드백 해결로 마킹
    const feedbackItem = page.locator('[data-testid="feedback-item"]:first-child')
    await feedbackItem.locator('[aria-label="Resolve Feedback"]').click()
    
    // 리뷰 완료
    await page.click('button:has-text("Complete Review")')

    // 9. Delivery 단계
    await page.click('[data-testid="delivery-tab"]')
    
    // 배송 가능한 파일 선택
    await page.check('[name="deliverable-mp4"]')
    await page.check('[name="deliverable-mov"]')
    await page.click('button:has-text("Complete Delivery")')

    // 10. 최종 완료 확인
    await expect(page.locator('[role="alert"]')).toHaveText(/Project completed successfully/i)
    await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '100')
    await expect(page.locator('[data-stage="completed"]')).toBeVisible()
    
    // 프로젝트 통계 확인
    await expect(page.locator('[data-testid="total-stages"]')).toHaveText('8')
    await expect(page.locator('[data-testid="completed-stages"]')).toHaveText('8')
    await expect(page.locator('[data-testid="completion-rate"]')).toHaveText('100%')
  })

  test('should handle workflow rollback scenario', async ({ page }) => {
    // 프로젝트 생성 및 3단계까지 진행
    await page.click('[aria-label="New Project"]')
    await page.fill('[name="title"]', 'Rollback Test Project')
    await page.click('button:has-text("Create Project")')

    // Planning → Scripting → Storyboard 완료
    await page.click('button:has-text("Complete Planning Stage")')
    await page.click('button:has-text("Complete Scripting")')
    await page.click('button:has-text("Complete Storyboard")')
    
    // 현재 shooting 단계 확인
    await expect(page.locator('[data-stage="shooting"]')).toHaveClass(/active/)
    
    // Rollback to scripting
    await page.click('[aria-label="Rollback Options"]')
    await page.click('button:has-text("Rollback to Scripting")')
    
    // 확인 다이얼로그
    await expect(page.locator('[role="dialog"]')).toHaveText(/Are you sure you want to rollback/i)
    await page.click('button:has-text("Confirm Rollback")')
    
    // 스크립트 단계로 롤백 확인
    await expect(page.locator('[data-stage="scripting"]')).toHaveClass(/active/)
    await expect(page.locator('[data-testid="completed-stages"]')).toHaveText('1') // Only planning completed
  })

  test('should handle pause and resume workflow', async ({ page }) => {
    // 프로젝트 생성 및 편집 단계까지 진행
    await page.click('[aria-label="New Project"]')
    await page.fill('[name="title"]', 'Pause Resume Test Project')
    await page.click('button:has-text("Create Project")')

    // 여러 단계 완료
    for (const stage of ['Planning', 'Scripting', 'Storyboard', 'Shooting']) {
      await page.click(`button:has-text("Complete ${stage}")`)
    }
    
    // 편집 단계에서 일시정지
    await expect(page.locator('[data-stage="editing"]')).toHaveClass(/active/)
    
    await page.click('[aria-label="Pause Workflow"]')
    await page.fill('[name="pauseReason"]', 'Equipment maintenance required')
    await page.click('button:has-text("Pause Project")')
    
    // 일시정지 상태 확인
    await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Paused')
    await expect(page.locator('[data-testid="pause-reason"]')).toHaveText(/Equipment maintenance/i)
    
    // 워크플로우 재개
    await page.click('button:has-text("Resume Workflow")')
    
    // 편집 단계로 복귀 확인
    await expect(page.locator('[data-stage="editing"]')).toHaveClass(/active/)
    await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Active')
  })

  test('should track real-time notifications during workflow', async ({ page }) => {
    // 프로젝트 생성
    await page.click('[aria-label="New Project"]')
    await page.fill('[name="title"]', 'Real-time Notifications Test')
    await page.click('button:has-text("Create Project")')

    // 실시간 알림 패널 열기
    await page.click('[aria-label="Show Notifications"]')
    await expect(page.locator('[data-testid="notification-panel"]')).toBeVisible()
    
    // 초기 알림 수 확인
    const initialNotificationCount = await page.locator('[data-testid="notification-item"]').count()
    
    // 단계 완료로 알림 생성
    await page.click('button:has-text("Complete Planning")')
    
    // 새로운 알림 확인 (최대 5초 대기)
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(initialNotificationCount + 1)
    
    // 최신 알림 내용 확인
    const latestNotification = page.locator('[data-testid="notification-item"]').first()
    await expect(latestNotification).toContainText('Planning stage completed')
    await expect(latestNotification).toContainText('just now')
    
    // 실시간 사용자 현황 확인
    await expect(page.locator('[data-testid="active-users-count"]')).toHaveText(/\d+ active users?/i)
    
    // 알림 읽음 처리
    await latestNotification.click()
    await expect(latestNotification).toHaveClass(/read/)
  })

  test('should maintain accessibility throughout workflow', async ({ page }) => {
    // 프로젝트 생성
    await page.click('[aria-label="New Project"]')
    await page.fill('[name="title"]', 'Accessibility Test Project')
    await page.click('button:has-text("Create Project")')

    // 키보드 네비게이션 테스트
    await page.keyboard.press('Tab') // Focus on first interactive element
    await expect(page.locator(':focus')).toBeVisible()
    
    // 모든 단계 탭이 키보드로 접근 가능한지 확인
    const stages = ['planning', 'scripting', 'storyboard', 'shooting', 'editing', 'post-production', 'review', 'delivery']
    
    for (const stage of stages) {
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toHaveAttribute('data-testid', `${stage}-tab`)
      
      // ARIA 속성 확인
      await expect(focusedElement).toHaveAttribute('role', 'tab')
      await expect(focusedElement).toHaveAttribute('aria-label')
    }
    
    // 스크린 리더 친화적 진행률 표시 확인
    const progressBar = page.locator('[data-testid="progress-bar"]')
    await expect(progressBar).toHaveAttribute('role', 'progressbar')
    await expect(progressBar).toHaveAttribute('aria-label', /\d+% complete/i)
    await expect(progressBar).toHaveAttribute('aria-valuenow')
    await expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    await expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    
    // 고대비 모드 지원 확인
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('body')).toHaveClass(/high-contrast|dark-mode/)
  })
})