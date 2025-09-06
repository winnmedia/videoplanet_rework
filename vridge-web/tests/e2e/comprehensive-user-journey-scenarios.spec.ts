/**
 * 포괄적 사용자 여정 시나리오 E2E 테스트
 * @description DEVPLAN.md 기반 모든 핵심 사용자 여정 검증
 * @layer tests/e2e
 */

import { test, expect } from '@playwright/test'
import { waitForAppReady, waitForComponent, waitForApiResponse, waitForFormSubmission, waitForModal } from './helpers/wait-utils'

test.describe('종합 사용자 여정 시나리오', () => {
  
  test.describe('🚀 프로젝트 생성부터 협업 시작까지', () => {
    test('신규 사용자 첫 프로젝트 생성 및 팀원 초대 완료 플로우', async ({ page }) => {
      // Given: 로그인된 사용자
      await waitForAppReady(page, { 
        route: '/dashboard',
        anchor: 'Dashboard'
      })

      // When: 새 프로젝트 생성 시작
      await page.click('[data-testid="create-project-button"]')
      await waitForModal(page, 'open', '[data-testid="create-project-modal"]')

      // 프로젝트 기본 정보 입력
      await page.fill('[data-testid="project-title"]', 'E2E 테스트 프로젝트')
      await page.fill('[data-testid="project-description"]', '사용자 여정 검증을 위한 테스트 프로젝트입니다')
      
      // Then: 자동 일정 프리뷰 카드 확인 (기획 1주, 촬영 1일, 편집 2주)
      await waitForComponent(page, 'auto-schedule-preview')
      
      const schedulePreview = page.locator('[data-testid="auto-schedule-preview"]')
      await expect(schedulePreview.locator('[data-phase="planning"]')).toContainText('1주')
      await expect(schedulePreview.locator('[data-phase="shooting"]')).toContainText('1일')
      await expect(schedulePreview.locator('[data-phase="editing"]')).toContainText('2주')

      // 프로젝트 생성 완료
      await page.click('[data-testid="create-project-submit"]')
      await waitForApiResponse(page, '/api/projects')
      await waitForModal(page, 'close')

      // When: 팀원 초대 시작
      await page.click('[data-testid="invite-team-button"]')
      await waitForModal(page, 'open', '[data-testid="invite-modal"]')

      // 초대 정보 입력
      await page.fill('[data-testid="invite-email"]', 'teammate@example.com')
      await page.selectOption('[data-testid="invite-role"]', 'Editor')
      
      // Then: 초대 메일 발송 및 쿨다운 적용
      await page.click('[data-testid="send-invitation"]')
      await waitForApiResponse(page, '/api/invitations')
      
      // 성공 알림 확인
      await expect(page.locator('[data-testid="toast-success"]')).toContainText('초대 메일이 발송되었습니다')
      
      // 재전송 쿨다운(60초) 적용 확인
      const resendButton = page.locator('[data-testid="resend-invitation"]')
      await expect(resendButton).toBeDisabled()
      await expect(resendButton).toHaveAttribute('title', /60/)
    })
  })

  test.describe('🎬 영상 기획 전체 워크플로우', () => {
    test('한 줄 스토리부터 완성된 콘티 PDF까지 생성하는 완전한 기획 과정', async ({ page }) => {
      // Given: 프로젝트가 있는 상태에서 영상 기획 진입
      await waitForAppReady(page, { 
        route: '/projects/1/planning',
        anchor: '영상 기획'
      })

      // When: STEP 1 - 입력/선택 단계
      await waitForComponent(page, 'planning-wizard-step1')
      
      // 기본 정보 입력
      await page.fill('[data-testid="project-title"]', '브랜드 홍보영상')
      await page.fill('[data-testid="story-logline"]', '혁신적인 제품으로 일상을 바꾸는 젊은 창업가의 이야기')
      
      // 프리셋 버튼 클릭으로 자동 채움 테스트
      await page.click('[data-testid="preset-brand-30sec"]')
      
      // Then: 프리셋 값들이 자동으로 채워졌는지 확인
      await expect(page.locator('[data-testid="tone-manner"]')).toHaveValue('시크')
      await expect(page.locator('[data-testid="genre"]')).toHaveValue('광고')
      await expect(page.locator('[data-testid="duration"]')).toHaveValue('30')
      await expect(page.locator('[data-testid="format"]')).toHaveValue('스토리텔링')
      
      // LLM 호출하여 4단계 생성
      await page.click('[data-testid="generate-4stages"]')
      await waitForApiResponse(page, '/api/video-planning/generate-stages')
      
      // When: STEP 2 - 4단계 검토/수정 단계
      await waitForComponent(page, 'planning-wizard-step2')
      
      // Then: 4개 카드(기승전결) 생성 확인
      const stageCards = page.locator('[data-testid^="stage-card-"]')
      await expect(stageCards).toHaveCount(4)
      
      // 인라인 편집 테스트
      await page.click('[data-testid="stage-card-1"] [data-testid="edit-button"]')
      await page.fill('[data-testid="stage-content-editor"]', '수정된 스토리 내용입니다')
      await page.click('[data-testid="save-edit"]')
      
      // 12숏 생성 시작
      await page.click('[data-testid="generate-12shots"]')
      await waitForApiResponse(page, '/api/video-planning/generate-storyboard')
      
      // When: STEP 3 - 12숏 편집 및 내보내기
      await waitForComponent(page, 'planning-wizard-step3')
      
      // Then: 정확히 12개 숏 카드 생성 확인
      const shotCards = page.locator('[data-testid^="shot-card-"]')
      await expect(shotCards).toHaveCount(12)
      
      // 콘티 이미지 생성 테스트 (첫 번째 숏)
      await page.click('[data-testid="shot-card-1"] [data-testid="generate-storyboard"]')
      await waitForApiResponse(page, '/api/ai-service/generate-image')
      
      // 콘티 이미지가 생성되었는지 확인
      const storyboardImage = page.locator('[data-testid="shot-card-1"] [data-testid="storyboard-image"]')
      await expect(storyboardImage).toBeVisible()
      
      // 인서트 3컷 추천 확인
      const insertChips = page.locator('[data-testid="shot-card-1"] [data-testid^="insert-chip-"]')
      await expect(insertChips).toHaveCount(3)
      
      // Finally: JSON + PDF 다운로드
      await page.click('[data-testid="export-planning"]')
      await waitForModal(page, 'open', '[data-testid="export-modal"]')
      
      // JSON 다운로드
      const jsonDownload = page.waitForDownload()
      await page.click('[data-testid="download-json"]')
      const json = await jsonDownload
      expect(json.suggestedFilename()).toMatch(/\.json$/)
      
      // PDF 다운로드 (Marp PDF, A4 가로, 여백 0)
      const pdfDownload = page.waitForDownload()
      await page.click('[data-testid="download-pdf"]')
      const pdf = await pdfDownload
      expect(pdf.suggestedFilename()).toMatch(/\.pdf$/)
    })
  })

  test.describe('📅 캘린더 충돌 관리 시나리오', () => {
    test('여러 프로젝트 일정 관리 및 촬영 충돌 감지/해결', async ({ page }) => {
      // Given: 여러 프로젝트가 있는 캘린더 화면
      await waitForAppReady(page, { 
        route: '/calendar',
        anchor: '전체일정'
      })

      // Then: 프로젝트별 색상 범례 고정 영역 확인
      await waitForComponent(page, 'project-legend')
      const legend = page.locator('[data-testid="project-legend"]')
      await expect(legend).toBeVisible()
      
      // 프로젝트별 고유 색상 스와치 확인
      const colorSwatches = legend.locator('[data-testid^="color-swatch-"]')
      await expect(colorSwatches.first()).toBeVisible()
      
      // When: 일정 드래그로 조정하여 촬영 충돌 발생시키기
      const shootingEvent1 = page.locator('[data-testid="event-shooting-project1"]')
      const shootingEvent2 = page.locator('[data-testid="event-shooting-project2"]')
      
      // 같은 날짜로 드래그하여 충돌 생성
      await shootingEvent2.dragTo(shootingEvent1)
      
      // Then: 촬영 충돌 경고 표시 확인
      await expect(shootingEvent1).toHaveClass(/conflict-error/)
      await expect(shootingEvent1).toHaveCSS('border-style', 'dashed')
      
      // 경고 아이콘과 툴팁 확인
      const conflictIcon = shootingEvent1.locator('[data-testid="conflict-icon"]')
      await expect(conflictIcon).toBeVisible()
      
      await shootingEvent1.hover()
      await expect(page.locator('[data-testid="conflict-tooltip"]')).toContainText('촬영 일정 충돌')
      
      // When: '충돌만 보기' 필터 활성화
      await page.check('[data-testid="show-conflicts-only"]')
      
      // Then: 충돌 이벤트만 표시되는지 확인
      const visibleEvents = page.locator('[data-testid^="event-"]:visible')
      await expect(visibleEvents).toHaveCount(2) // 충돌된 2개 이벤트만
      
      // 기획/편집 이벤트는 충돌 경고 없음 확인
      const planningEvent = page.locator('[data-testid="event-planning-project1"]')
      await expect(planningEvent).not.toHaveClass(/conflict/)
    })
  })

  test.describe('💬 영상 피드백 협업 시나리오', () => {
    test('타임코드 기반 피드백 주고받기 전체 과정', async ({ page }) => {
      // Given: 영상이 업로드된 피드백 화면
      await waitForAppReady(page, { 
        route: '/projects/1/feedback',
        anchor: '영상 피드백'
      })

      // 비디오 플레이어 로딩 대기
      await waitForComponent(page, 'video-player')
      
      // When: 특정 시점(30초)으로 이동 후 코멘트 작성
      await page.click('[data-testid="video-player"]')
      await page.keyboard.press('Space') // 재생
      await page.waitForTimeout(2000) // 2초간 재생
      await page.keyboard.press('Space') // 일시정지
      
      // '현재 시점 코멘트' 버튼 클릭
      await page.click('[data-testid="comment-at-current-time"]')
      
      // Then: 타임코드가 자동으로 삽입되었는지 확인
      const commentInput = page.locator('[data-testid="comment-input"]')
      const inputValue = await commentInput.inputValue()
      expect(inputValue).toMatch(/^\[\d{2}:\d{2}\.\d{3}\]/) // [mm:ss.mmm] 형식
      
      // 코멘트 내용 작성
      await commentInput.fill(`${inputValue} 이 부분의 색감이 너무 어두워 보입니다`)
      await page.click('[data-testid="submit-comment"]')
      
      // When: 스크린샷 첨부
      await page.click('[data-testid="capture-screenshot"]')
      await waitForApiResponse(page, '/api/screenshots')
      
      // Then: 스크린샷 파일명 규칙 확인 (project-{slug}_TC{mmssfff}_{timestamp}.jpg)
      const screenshotPreview = page.locator('[data-testid="screenshot-preview"]')
      await expect(screenshotPreview).toBeVisible()
      
      const filename = await screenshotPreview.getAttribute('alt')
      expect(filename).toMatch(/project-.*_TC\d{7}_\d{4}-\d{2}-\d{2}T\d{6}\.jpg/)
      
      // When: 대댓글 및 감정표현 추가
      const firstComment = page.locator('[data-testid^="comment-"]:first-child')
      
      // 좋아요 감정표현
      await firstComment.locator('[data-testid="reaction-like"]').click()
      await expect(firstComment.locator('[data-testid="reaction-like-count"]')).toContainText('1')
      
      // 대댓글 작성
      await firstComment.locator('[data-testid="reply-button"]').click()
      await page.fill('[data-testid="reply-input"]', '네, 다음 편집에서 색보정 하겠습니다')
      await page.click('[data-testid="submit-reply"]')
      
      // Then: 대댓글이 정상 표시되는지 확인
      const replies = firstComment.locator('[data-testid^="reply-"]')
      await expect(replies).toHaveCount(1)
      
      // When: 코멘트 정렬 및 필터 테스트
      await page.selectOption('[data-testid="comment-sort"]', 'timecode')
      await waitForTimeout(1000)
      
      // Then: 타임코드 순서대로 정렬되었는지 확인
      const sortedComments = page.locator('[data-testid^="comment-"]')
      const firstTimecode = await sortedComments.first().locator('[data-testid="comment-timecode"]').textContent()
      const secondTimecode = await sortedComments.nth(1).locator('[data-testid="comment-timecode"]').textContent()
      
      // 타임코드 비교 (첫 번째가 두 번째보다 작거나 같아야 함)
      expect(firstTimecode?.localeCompare(secondTimecode || '') || 0).toBeLessThanOrEqual(0)
    })
  })

  test.describe('📊 대시보드 통합 모니터링 시나리오', () => {
    test('모든 활동 통합 모니터링 및 우선 액션', async ({ page }) => {
      // Given: 다양한 활동이 있는 대시보드
      await waitForAppReady(page, { 
        route: '/dashboard',
        anchor: 'Dashboard'
      })

      // Then: 새 피드 요약 카드 확인
      await waitForComponent(page, 'new-feed-summary')
      const feedSummary = page.locator('[data-testid="new-feed-summary"]')
      
      // 새 코멘트/대댓글/감정표현 집계 확인
      await expect(feedSummary.locator('[data-testid="new-comments-count"]')).toBeVisible()
      await expect(feedSummary.locator('[data-testid="new-replies-count"]')).toBeVisible()
      await expect(feedSummary.locator('[data-testid="new-reactions-count"]')).toBeVisible()
      
      // Then: 초대 관리 요약 확인
      await waitForComponent(page, 'invitation-summary')
      const invitationSummary = page.locator('[data-testid="invitation-summary"]')
      
      await expect(invitationSummary.locator('[data-testid="sent-invitations"]')).toBeVisible()
      await expect(invitationSummary.locator('[data-testid="received-invitations"]')).toBeVisible()
      
      // Then: 편집 일정 간트 요약 확인
      await waitForComponent(page, 'schedule-gantt-summary')
      const ganttSummary = page.locator('[data-testid="schedule-gantt-summary"]')
      
      // 프로젝트별 진행상황 바 확인
      const progressBars = ganttSummary.locator('[data-testid^="project-progress-"]')
      await expect(progressBars.first()).toBeVisible()
      
      // Then: 읽지 않음 배지 정확성 확인
      const unreadBadges = page.locator('[data-testid^="unread-badge-"]')
      
      // 배지 클릭하여 상세 화면 이동
      if (await unreadBadges.first().isVisible()) {
        const initialCount = await unreadBadges.first().textContent()
        await unreadBadges.first().click()
        
        // 상세 화면에서 자동 읽음 처리 후 돌아왔을 때 배지 감소 확인
        await page.goBack()
        await waitForAppReady(page, { route: '/dashboard' })
        
        const updatedCount = await unreadBadges.first().textContent()
        expect(parseInt(updatedCount || '0')).toBeLessThan(parseInt(initialCount || '1'))
      }
      
      // When: '모두 읽음' 기능 테스트
      if (await page.locator('[data-testid="mark-all-read"]').isVisible()) {
        await page.click('[data-testid="mark-all-read"]')
        
        // Then: 모든 배지가 사라졌거나 0이 되었는지 확인
        await expect(page.locator('[data-testid^="unread-badge-"]:visible')).toHaveCount(0)
      }
    })
  })

  test.describe('🔔 알림센터 및 네비게이션 시나리오', () => {
    test('알림을 통한 중요 업데이트 인지 및 화면 이동', async ({ page }) => {
      // Given: 알림이 있는 상태
      await waitForAppReady(page, { 
        route: '/dashboard',
        anchor: 'Dashboard'
      })

      // When: 헤더 벨 아이콘 클릭
      const bellIcon = page.locator('[data-testid="notification-bell"]')
      await bellIcon.click()
      
      // Then: 드로어에 최근 10개 알림 표시
      await waitForModal(page, 'open', '[data-testid="notification-drawer"]')
      const notifications = page.locator('[data-testid^="notification-item-"]')
      const notificationCount = await notifications.count()
      expect(notificationCount).toBeLessThanOrEqual(10)
      
      // 알림 유형별 분류 확인
      const inviteNotification = notifications.filter({ hasText: '초대' }).first()
      const commentNotification = notifications.filter({ hasText: '코멘트' }).first()
      const conflictNotification = notifications.filter({ hasText: '충돌' }).first()
      
      // When: 코멘트 알림 클릭하여 관련 화면 이동
      if (await commentNotification.isVisible()) {
        await commentNotification.click()
        
        // Then: 올바른 피드백 화면으로 이동했는지 확인
        await waitForAppReady(page, { route: /\/projects\/\d+\/feedback/ })
        await expect(page).toHaveURL(/\/projects\/\d+\/feedback/)
        
        // 읽음 처리 확인을 위해 다시 대시보드로 이동
        await page.goto('/dashboard')
        await waitForAppReady(page, { route: '/dashboard' })
        
        // 알림 벨 다시 클릭
        await bellIcon.click()
        
        // 해당 알림이 읽음 처리되었는지 확인 (스타일 변화 또는 제거)
        const readNotification = page.locator(`[data-testid="notification-item-${await commentNotification.getAttribute('data-id')}"]`)
        if (await readNotification.isVisible()) {
          await expect(readNotification).toHaveClass(/read/)
        }
      }
      
      // Then: 접근성 확인
      // ESC 키로 드로어 닫기
      await page.keyboard.press('Escape')
      await waitForModal(page, 'close', '[data-testid="notification-drawer"]')
      
      // aria-label에 새 알림 수 포함 확인
      const ariaLabel = await bellIcon.getAttribute('aria-label')
      expect(ariaLabel).toMatch(/알림|notification/i)
      
      // 포커스 트랩 확인 (드로어 다시 열기)
      await bellIcon.click()
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    })
  })

  test.describe('🔄 크로스 기능 통합 시나리오', () => {
    test('전체 프로젝트 완료 워크플로우 - 다기능 연계', async ({ page }) => {
      // Given: 신규 프로젝트 생성부터 시작
      await waitForAppReady(page, { route: '/dashboard' })
      
      // Phase 1: 프로젝트 생성
      await page.click('[data-testid="create-project-button"]')
      await waitForModal(page, 'open')
      
      await page.fill('[data-testid="project-title"]', '통합 테스트 프로젝트')
      await page.click('[data-testid="create-project-submit"]')
      await waitForApiResponse(page, '/api/projects')
      
      // Phase 2: 팀원 초대
      await page.click('[data-testid="invite-team-button"]')
      await page.fill('[data-testid="invite-email"]', 'editor@example.com')
      await page.selectOption('[data-testid="invite-role"]', 'Editor')
      await page.click('[data-testid="send-invitation"]')
      
      // Phase 3: 영상 기획
      await page.goto('/projects/latest/planning')
      await waitForAppReady(page, { route: '/projects/latest/planning' })
      
      await page.fill('[data-testid="story-logline"]', '통합 테스트를 위한 샘플 스토리')
      await page.click('[data-testid="generate-4stages"]')
      await waitForApiResponse(page, '/api/video-planning/generate-stages')
      
      // Phase 4: 캘린더에서 일정 확인/조정
      await page.goto('/calendar')
      await waitForAppReady(page, { route: '/calendar' })
      
      // 새로 생성된 프로젝트가 캘린더에 표시되는지 확인
      const newProjectEvents = page.locator('[data-project="통합 테스트 프로젝트"]')
      await expect(newProjectEvents.first()).toBeVisible()
      
      // Phase 5: 대시보드에서 통합 상태 확인
      await page.goto('/dashboard')
      await waitForAppReady(page, { route: '/dashboard' })
      
      // Then: 모든 단계의 데이터가 대시보드에 반영되었는지 확인
      await expect(page.locator('[data-testid="new-feed-summary"]')).toContainText('통합 테스트 프로젝트')
      await expect(page.locator('[data-testid="invitation-summary"]')).toContainText('1') // 1개 초대 발송
      
      // Finally: 권한에 따른 기능 접근 제어 확인
      // 현재 사용자는 Owner이므로 모든 기능 접근 가능
      await expect(page.locator('[data-testid="project-settings"]')).toBeVisible()
      await expect(page.locator('[data-testid="invite-team-button"]')).toBeEnabled()
      
      // 전역 알림센터에 관련 알림 표시 확인
      await page.click('[data-testid="notification-bell"]')
      const notifications = page.locator('[data-testid^="notification-item-"]')
      
      // 프로젝트 생성, 초대 발송 관련 알림이 있는지 확인
      await expect(notifications.filter({ hasText: '프로젝트' })).toHaveCount({ min: 1 })
    })
  })
})