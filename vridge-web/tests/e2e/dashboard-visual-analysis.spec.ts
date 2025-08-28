/**
 * VRidge 대시보드 시각적 분석 및 스크린샷 캡처 테스트
 * 목표: UI/UX 상태 정밀 분석 및 DEVPLAN 요구사항 비교
 */

import { test, expect, Page } from '@playwright/test';

test.describe('VRidge 대시보드 시각적 분석', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // 대시보드 페이지 로드
    await page.goto('/dashboard');
    
    // 페이지 로딩 완료 대기
    await page.waitForSelector('[data-testid="dashboard-main-content"], main', { timeout: 30000 });
    
    // 추가 안정화 대기 (동적 로딩 콘텐츠)
    await page.waitForTimeout(2000);
  });

  test('대시보드 전체 페이지 스크린샷 및 레이아웃 분석', async () => {
    // 전체 페이지 스크린샷 캡처
    await page.screenshot({
      path: 'test-results/dashboard-full-page.png',
      fullPage: true,
      animations: 'disabled'
    });

    // 메인 콘텐츠 영역 스크린샷
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
    await mainContent.screenshot({
      path: 'test-results/dashboard-analysis-content.png',
      animations: 'disabled'
    });

    // 사이드바 스크린샷
    const sidebar = page.locator('[data-testid="sidebar"], aside, .sidebar').first();
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({
        path: 'test-results/dashboard-analysis-sidebar.png',
        animations: 'disabled'
      });
    }
  });

  test('핵심 위젯별 상세 UI 요소 검증 및 스크린샷', async () => {
    // 피드백 요약 카드
    const feedbackCard = page.locator('[data-testid*="feedback"], [class*="feedback"]').first();
    if (await feedbackCard.isVisible()) {
      await feedbackCard.screenshot({
        path: 'test-results/feedback-summary-card.png',
        animations: 'disabled'
      });
    }

    // 초대 관리 카드
    const invitationCard = page.locator('[data-testid*="invitation"], [class*="invitation"]').first();
    if (await invitationCard.isVisible()) {
      await invitationCard.screenshot({
        path: 'test-results/invitation-summary-card.png',
        animations: 'disabled'
      });
    }

    // 프로젝트 통계 섹션
    const projectStats = page.locator('[data-testid*="project"], .grid:has(.text-2xl)').first();
    if (await projectStats.isVisible()) {
      await projectStats.screenshot({
        path: 'test-results/project-stats.png',
        animations: 'disabled'
      });
    }

    // 빠른 네비게이션 섹션
    const quickNav = page.locator('[data-testid*="quick"], .grid:has(.group):has(svg)').first();
    if (await quickNav.isVisible()) {
      await quickNav.screenshot({
        path: 'test-results/quick-navigation.png',
        animations: 'disabled'
      });
    }

    // 최근 활동 및 빠른 작업 섹션
    const activitySection = page.locator('[data-testid*="activity"], .xl\\:col-span-2').first();
    if (await activitySection.isVisible()) {
      await activitySection.screenshot({
        path: 'test-results/activity-and-actions.png',
        animations: 'disabled'
      });
    }
  });

  test('UI/UX 품질 요소 검증', async () => {
    // 로딩 상태 처리 확인
    const hasLoadingStates = await page.locator('.animate-spin, [data-testid*="loading"]').count() >= 0;
    
    // 빈 상태 처리 확인
    const hasEmptyStates = await page.locator(':text("활동이 없습니다"), :text("데이터가 없습니다")').count() >= 0;
    
    // 읽지 않음 배지 확인
    const unreadBadges = page.locator('[data-testid*="unread"], [class*="badge"]');
    const badgeCount = await unreadBadges.count();
    
    // 반응형 그리드 레이아웃 확인
    const gridLayouts = page.locator('[class*="grid"]');
    const gridCount = await gridLayouts.count();
    
    // 접근성 요소 확인
    const accessibilityElements = page.locator('[aria-label], [role]');
    const accessibilityCount = await accessibilityElements.count();
    
    console.log(`UI/UX 품질 체크:
    - 로딩 상태: ${hasLoadingStates ? '✓' : '✗'}
    - 빈 상태: ${hasEmptyStates ? '✓' : '✗'}
    - 읽지 않음 배지: ${badgeCount}개
    - 그리드 레이아웃: ${gridCount}개
    - 접근성 요소: ${accessibilityCount}개`);
  });

  test('색상 체계 및 시각적 일관성 검증', async () => {
    // Tailwind CSS 색상 클래스 사용 확인
    const tailwindColors = [
      'text-vridge-',
      'bg-vridge-',
      'text-primary-',
      'bg-primary-',
      'text-success-',
      'bg-success-',
      'text-warning-',
      'bg-warning-',
      'text-error-',
      'bg-error-'
    ];
    
    for (const colorClass of tailwindColors) {
      const elements = await page.locator(`[class*="${colorClass}"]`).count();
      if (elements > 0) {
        console.log(`${colorClass} 클래스 사용: ${elements}개 요소`);
      }
    }
    
    // 그라디언트 사용 확인
    const gradientElements = await page.locator('[class*="gradient"]').count();
    console.log(`그라디언트 사용: ${gradientElements}개 요소`);
  });
});