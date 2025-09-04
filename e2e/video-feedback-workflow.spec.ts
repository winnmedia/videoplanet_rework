// e2e/video-feedback-workflow.spec.ts
import { AxeBuilder } from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

/**
 * Phase 4 E2E 테스트: 영상 피드백 워크플로우
 * 
 * 테스트 시나리오:
 * 1. 영상 재생 및 댓글 추가
 * 2. 타임스탬프 기반 네비게이션  
 * 3. 피드백 상태 관리
 * 4. 접근성 준수 검증
 */

test.describe('영상 피드백 워크플로우', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API 응답 설정
    await page.route('/api/video-sessions/*', async route => {
      const mockSession = {
        id: '1',
        title: '테스트 영상',
        videoUrl: '/test-video.mp4',
        duration: 120,
        status: 'in_review',
        comments: [
          {
            id: 'c1',
            timestamp: 15.5,
            content: '여기서 음성이 끊어집니다',
            priority: 'high',
            position: { x: 50, y: 30 },
            author: '검토자1'
          }
        ]
      };
      await route.fulfill({ json: mockSession });
    });

    await page.goto('/video-feedback/1');
    await page.waitForLoadState('networkidle');
  });

  test('영상 재생 및 타임스탬프 댓글 추가', async ({ page }) => {
    // Given: 영상 피드백 페이지가 로드된다
    await expect(page.locator('[data-testid="video-player"]')).toBeVisible();
    await expect(page.locator('[data-testid="feedback-timeline"]')).toBeVisible();

    // When: 영상을 재생하고 특정 시점에서 일시정지한다
    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.click();
    await expect(page.locator('[data-testid="video-status"]')).toContainText('재생 중');

    // 15초 지점으로 이동
    const progressBar = page.locator('[data-testid="progress-bar"]');
    const boundingBox = await progressBar.boundingBox();
    if (boundingBox) {
      // 15초/120초 = 12.5% 지점 클릭
      const clickX = boundingBox.x + (boundingBox.width * 0.125);
      await page.mouse.click(clickX, boundingBox.y + boundingBox.height / 2);
    }

    // 일시정지
    const pauseButton = page.locator('[data-testid="pause-button"]');
    await pauseButton.click();
    await expect(page.locator('[data-testid="current-time"]')).toContainText('00:15');

    // And: 영상 화면을 클릭하여 댓글을 추가한다
    const videoElement = page.locator('video');
    await videoElement.click({ position: { x: 200, y: 150 } });

    // 댓글 모달이 열린다
    const commentModal = page.locator('[data-testid="comment-modal"]');
    await expect(commentModal).toBeVisible();
    await expect(page.locator('[data-testid="timestamp-display"]')).toContainText('00:15');

    // 댓글 작성
    await page.locator('[data-testid="comment-input"]').fill('이 부분에서 색상 보정이 필요합니다');
    
    // And: 피드백 우선순위를 '긴급'으로 설정한다
    await page.locator('[data-testid="priority-select"]').selectOption('urgent');
    await page.locator('[data-testid="submit-comment"]').click();

    // Then: 타임라인에 빨간색 마커가 표시된다
    const urgentMarker = page.locator('[data-testid="comment-marker"][data-priority="urgent"]');
    await expect(urgentMarker).toBeVisible();
    await expect(urgentMarker).toHaveCSS('background-color', 'rgb(220, 53, 69)'); // 빨간색

    // And: 댓글이 해당 시간에 정확히 배치된다
    const markerPosition = await urgentMarker.getAttribute('style');
    expect(markerPosition).toContain('left: 12.5%'); // 15초/120초 = 12.5%

    // And: 댓글 리스트에 새 댓글이 표시된다
    const commentList = page.locator('[data-testid="comment-list"]');
    await expect(commentList.locator('.comment-item').last()).toContainText('이 부분에서 색상 보정이 필요합니다');
    await expect(commentList.locator('.comment-item').last()).toContainText('00:15');
  });

  test('타임라인 마커 클릭으로 해당 시간 이동', async ({ page }) => {
    // Given: 기존 댓글 마커가 있는 상태
    const existingMarker = page.locator('[data-testid="comment-marker"]').first();
    await expect(existingMarker).toBeVisible();

    // When: 타임라인의 댓글 마커를 클릭한다
    await existingMarker.click();

    // Then: 비디오가 해당 시간으로 이동한다
    await expect(page.locator('[data-testid="current-time"]')).toContainText('00:15');
    
    // And: 해당 댓글이 하이라이트된다
    const highlightedComment = page.locator('[data-testid="comment-list"] .comment-item.highlighted');
    await expect(highlightedComment).toBeVisible();
    await expect(highlightedComment).toContainText('여기서 음성이 끊어집니다');
  });

  test('피드백 상태 변경 워크플로우', async ({ page }) => {
    // Given: 검토 중인 영상이 로드된다
    await expect(page.locator('[data-testid="feedback-status"]')).toContainText('검토 중');

    // When: 상태를 '수정 필요'로 변경한다
    const statusDropdown = page.locator('[data-testid="status-dropdown"]');
    await statusDropdown.click();
    await page.locator('[data-value="needs_revision"]').click();

    // And: 수정 요청 사유를 작성한다
    const revisionModal = page.locator('[data-testid="revision-modal"]');
    await expect(revisionModal).toBeVisible();
    await page.locator('[data-testid="revision-reason"]').fill('색상 보정 및 음성 싱크 조정 필요');
    await page.locator('[data-testid="submit-revision"]').click();

    // Then: 상태가 변경된다
    await expect(page.locator('[data-testid="feedback-status"]')).toContainText('수정 필요');
    
    // And: 수정 요청 알림이 표시된다
    const notification = page.locator('[data-testid="toast-notification"]');
    await expect(notification).toContainText('수정 요청이 전송되었습니다');
  });

  test('키보드 네비게이션 및 단축키', async ({ page }) => {
    // Given: 영상 플레이어에 포커스가 있다
    const videoPlayer = page.locator('[data-testid="video-player"]');
    await videoPlayer.focus();

    // When: 스페이스바로 재생/정지를 제어한다
    await page.keyboard.press('Space');
    await expect(page.locator('[data-testid="video-status"]')).toContainText('재생 중');

    await page.keyboard.press('Space');
    await expect(page.locator('[data-testid="video-status"]')).toContainText('일시정지');

    // And: 화살표 키로 시간을 탐색한다
    await page.keyboard.press('ArrowRight'); // 5초 앞으로
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight'); // 총 15초

    await expect(page.locator('[data-testid="current-time"]')).toContainText('00:15');

    // And: M 키로 음소거를 제어한다
    await page.keyboard.press('KeyM');
    await expect(page.locator('[data-testid="mute-indicator"]')).toBeVisible();

    // And: F 키로 전체화면을 제어한다
    await page.keyboard.press('KeyF');
    // 전체화면 모드는 사용자 제스처가 필요하므로 요청만 확인
    await expect(page.locator('[data-testid="fullscreen-request"]')).toBeVisible();
  });

  test('드래그로 영역 선택 후 댓글 추가', async ({ page }) => {
    // Given: 영상이 일시정지된 상태
    const pauseButton = page.locator('[data-testid="pause-button"]');
    await pauseButton.click();

    const videoElement = page.locator('video');

    // When: 마우스를 드래그하여 영역을 선택한다
    const boundingBox = await videoElement.boundingBox();
    if (boundingBox) {
      await page.mouse.move(boundingBox.x + 100, boundingBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(boundingBox.x + 300, boundingBox.y + 200);
      await page.mouse.up();
    }

    // Then: 선택 영역이 표시된다
    const selectionArea = page.locator('[data-testid="selection-area"]');
    await expect(selectionArea).toBeVisible();

    // And: 댓글 추가 버튼이 나타난다
    const addCommentButton = page.locator('[data-testid="add-area-comment"]');
    await expect(addCommentButton).toBeVisible();

    // When: 영역 댓글을 추가한다
    await addCommentButton.click();
    const areaCommentModal = page.locator('[data-testid="area-comment-modal"]');
    await expect(areaCommentModal).toBeVisible();

    await page.locator('[data-testid="area-comment-input"]').fill('이 영역의 조명이 부족합니다');
    await page.locator('[data-testid="submit-area-comment"]').click();

    // Then: 영역 마커가 비디오 위에 표시된다
    const areaMarker = page.locator('[data-testid="area-marker"]');
    await expect(areaMarker).toBeVisible();
  });

  test('접근성 (WCAG 2.1 AA) 준수 검증', async ({ page }) => {
    // axe-core를 사용한 접근성 검사
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // 키보드 접근성 검사
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="video-player"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="play-button"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="progress-bar"]')).toBeFocused();

    // ARIA 레이블 검사
    const videoElement = page.locator('video');
    await expect(videoElement).toHaveAttribute('aria-label');
    
    const progressBar = page.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toHaveAttribute('role', 'slider');
    await expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    await expect(progressBar).toHaveAttribute('aria-valuemax', '120');

    // 고대비 모드 지원 검사
    await page.emulateMedia({ colorScheme: 'dark' });
    const playButton = page.locator('[data-testid="play-button"]');
    const buttonColor = await playButton.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    // 고대비 모드에서 버튼 색상이 변경되는지 확인
    expect(buttonColor).not.toBe('rgb(0, 0, 0)');
  });

  test('스크린 리더 호환성', async ({ page }) => {
    // 스크린 리더 알림 검사
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();

    // 비디오 재생 시 상태 알림
    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.click();

    await expect(liveRegion).toContainText('영상 재생 시작');

    // 댓글 추가 시 알림
    const videoElement = page.locator('video');
    await videoElement.click();
    
    const commentModal = page.locator('[data-testid="comment-modal"]');
    await page.locator('[data-testid="comment-input"]').fill('테스트 댓글');
    await page.locator('[data-testid="submit-comment"]').click();

    await expect(liveRegion).toContainText('댓글이 추가되었습니다');

    // 타임스탬프 정보 접근성
    const commentMarker = page.locator('[data-testid="comment-marker"]').first();
    const markerLabel = await commentMarker.getAttribute('aria-label');
    expect(markerLabel).toMatch(/\d+초 지점의 댓글/);
  });

  test('성능 메트릭 측정', async ({ page }) => {
    // 페이지 로딩 성능 측정
    const navigationPromise = page.waitForLoadState('networkidle');
    const startTime = Date.now();
    
    await page.goto('/video-feedback/1');
    await navigationPromise;
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // 3초 이내 로딩

    // 비디오 로딩 시간 측정
    const videoLoadStart = Date.now();
    const videoElement = page.locator('video');
    await videoElement.waitFor({ state: 'attached' });
    
    // 비디오 메타데이터 로딩 완료 대기
    await page.evaluate(() => {
      const video = document.querySelector('video');
      return new Promise(resolve => {
        if (video && video.readyState >= 1) {
          resolve(true);
        } else if (video) {
          video.addEventListener('loadedmetadata', () => resolve(true));
        }
      });
    });

    const videoLoadTime = Date.now() - videoLoadStart;
    expect(videoLoadTime).toBeLessThan(2000); // 2초 이내 비디오 메타데이터 로딩

    // Cumulative Layout Shift (CLS) 측정
    const clsValue = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const clsEntry = entries.find(entry => entry.name === 'layout-shift');
          if (clsEntry) {
            resolve(clsEntry.value);
          }
        }).observe({ type: 'layout-shift', buffered: true });

        // 3초 후 측정 완료
        setTimeout(() => resolve(0), 3000);
      });
    });

    expect(clsValue).toBeLessThan(0.1); // CLS < 0.1
  });
});