/**
 * 대시보드 시각적 테스트
 * VRidge 대시보드의 전체적인 모습과 위젯 구성을 시각적으로 확인
 */

import { test, expect } from '@playwright/test';

test.describe('VRidge 대시보드 시각적 테스트', () => {
  test('대시보드 전체 페이지 스크린샷 및 위젯 확인', async ({ page }) => {
    // 대시보드 페이지로 이동
    await page.goto('https://vridge-xyc331ybx-vlanets-projects.vercel.app/dashboard');

    // 페이지 로딩 완료 대기 (데이터 로딩까지)
    await page.waitForLoadState('networkidle');
    
    // 주요 위젯들이 로드될 때까지 대기
    await expect(page.locator('text=새 피드백 요약')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=초대 관리 요약')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=빠른 이동')).toBeVisible({ timeout: 5000 });
    
    // 전체 페이지 스크린샷
    await page.screenshot({
      path: 'test-results/dashboard-full-page.png',
      fullPage: true
    });

    console.log('✅ 대시보드 전체 페이지 스크린샷 저장됨: test-results/dashboard-full-page.png');

    // 헤더 섹션 확인
    const header = page.locator('main header');
    await expect(header).toBeVisible();
    
    // 현재 시간이 표시되는지 확인
    const timeDisplay = header.locator('h1');
    await expect(timeDisplay).toBeVisible();
    
    console.log('✅ 헤더 섹션 (시간 표시) 확인 완료');

    // 핵심 기능 위젯들 확인
    const feedbackCard = page.locator('text=새 피드백 요약').locator('..');
    await expect(feedbackCard).toBeVisible();
    await feedbackCard.screenshot({ path: 'test-results/feedback-summary-card.png' });
    
    const invitationCard = page.locator('text=초대 관리 요약').locator('..');
    await expect(invitationCard).toBeVisible();
    await invitationCard.screenshot({ path: 'test-results/invitation-summary-card.png' });

    console.log('✅ 피드백 및 초대 카드 위젯 스크린샷 저장 완료');

    // 빠른 네비게이션 확인 (FontAwesome 아이콘들)
    const quickNavigation = page.locator('text=빠른 이동').locator('..');
    await expect(quickNavigation).toBeVisible();
    await quickNavigation.screenshot({ path: 'test-results/quick-navigation.png' });

    // 각 네비게이션 버튼 확인
    await expect(page.locator('button[aria-label="캘린더 페이지로 이동"]')).toBeVisible();
    await expect(page.locator('button[aria-label="프로젝트 페이지로 이동"]')).toBeVisible();
    await expect(page.locator('button[aria-label="피드백 페이지로 이동"]')).toBeVisible();
    await expect(page.locator('button[aria-label="영상 기획 페이지로 이동"]')).toBeVisible();

    console.log('✅ 빠른 네비게이션 (FontAwesome 아이콘) 확인 완료');

    // 프로젝트 현황 통계 확인
    const projectStats = page.locator('text=프로젝트 현황').locator('..');
    await expect(projectStats).toBeVisible();
    await projectStats.screenshot({ path: 'test-results/project-stats.png' });

    console.log('✅ 프로젝트 현황 통계 위젯 스크린샷 저장 완료');

    // 최근 활동 및 빠른 작업 영역 확인
    const recentActivity = page.locator('text=최근 활동').locator('..');
    await expect(recentActivity).toBeVisible();
    
    const quickActions = page.locator('text=빠른 작업').locator('..');  
    await expect(quickActions).toBeVisible();

    // 하단 섹션 스크린샷
    const bottomSection = page.locator('section').last();
    await bottomSection.screenshot({ path: 'test-results/activity-and-actions.png' });

    console.log('✅ 최근 활동 및 빠른 작업 영역 확인 완료');

    // 페이지 전체적인 레이아웃 검증
    const mainContent = page.locator('main');
    await expect(mainContent).toHaveClass(/ml-sidebar/);
    
    console.log('✅ 사이드바와 메인 콘텐츠 레이아웃 확인 완료');

    // 반응형 그리드 레이아웃 확인
    const feedbackGrid = page.locator('.grid.grid-cols-1.lg\\:grid-cols-2').first();
    await expect(feedbackGrid).toBeVisible();

    console.log('✅ 반응형 그리드 레이아웃 확인 완료');
  });

  test('위젯별 상세 UI 요소 검증', async ({ page }) => {
    await page.goto('https://vridge-xyc331ybx-vlanets-projects.vercel.app/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=새 피드백 요약', { timeout: 10000 });

    // 피드백 요약 카드 내부 요소들 확인
    const feedbackCard = page.locator('text=새 피드백 요약').locator('..');
    
    // 통계 숫자들이 표시되는지 확인
    const statsElements = feedbackCard.locator('.text-2xl.font-bold');
    const statsCount = await statsElements.count();
    expect(statsCount).toBeGreaterThan(0);

    console.log(`✅ 피드백 카드 통계 요소 ${statsCount}개 확인됨`);

    // 전체보기 버튼 확인
    const viewAllButton = page.locator('text=전체보기').first();
    await expect(viewAllButton).toBeVisible();
    
    console.log('✅ 전체보기 버튼 확인 완료');

    // UnreadBadge 컴포넌트 확인 (읽지 않음 배지)
    const unreadBadges = page.locator('[data-testid="unread-badge"]');
    const badgeCount = await unreadBadges.count();
    
    if (badgeCount > 0) {
      console.log(`✅ 읽지 않음 배지 ${badgeCount}개 확인됨`);
    } else {
      console.log('ℹ️ 현재 읽지 않음 배지 없음 (정상 상태)');
    }

    // 카드들의 일관된 스타일링 확인
    const allCards = page.locator('.p-6.bg-white.border');
    const cardCount = await allCards.count();
    expect(cardCount).toBeGreaterThan(0);
    
    console.log(`✅ 일관된 카드 스타일을 가진 위젯 ${cardCount}개 확인됨`);
  });

  test('FontAwesome 아이콘 및 크기 일관성 검증', async ({ page }) => {
    await page.goto('https://vridge-xyc331ybx-vlanets-projects.vercel.app/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=빠른 이동', { timeout: 10000 });

    // FontAwesome 아이콘들이 올바르게 렌더링되는지 확인
    const iconButtons = page.locator('button[aria-label*="페이지로 이동"]');
    const buttonCount = await iconButtons.count();
    expect(buttonCount).toBe(4); // 캘린더, 프로젝트, 피드백, 영상 기획

    console.log(`✅ 빠른 네비게이션 버튼 ${buttonCount}개 확인됨`);

    // 각 버튼의 아이콘 크기 일관성 확인
    for (let i = 0; i < buttonCount; i++) {
      const button = iconButtons.nth(i);
      const icon = button.locator('svg').first();
      
      // w-8 h-8 클래스 확인
      await expect(icon).toHaveClass(/w-8/);
      await expect(icon).toHaveClass(/h-8/);
      
      // 아이콘이 실제로 보이는지 확인
      await expect(icon).toBeVisible();
    }

    console.log('✅ 모든 FontAwesome 아이콘 크기 일관성(w-8 h-8) 확인 완료');

    // 아이콘 컨테이너 크기도 확인
    for (let i = 0; i < buttonCount; i++) {
      const button = iconButtons.nth(i);
      const iconContainer = button.locator('.w-16.h-16').first();
      await expect(iconContainer).toBeVisible();
    }

    console.log('✅ 아이콘 컨테이너 크기(w-16 h-16) 일관성 확인 완료');
  });
});