const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('🚀 대시보드 페이지 분석 시작...');
    
    // 1. 페이지 로딩 및 기본 정보 수집
    console.log('\n📍 1단계: 페이지 접근 및 로딩');
    await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle' });
    
    // 페이지 타이틀 확인
    const title = await page.title();
    console.log(`   페이지 제목: ${title}`);
    
    // 2. 레이아웃 구조 분석
    console.log('\n🏗️ 2단계: 레이아웃 구조 분석');
    
    // 사이드바 확인
    const sidebar = page.locator('[data-testid="sidebar"]');
    const sidebarExists = await sidebar.isVisible();
    console.log(`   사이드바 존재: ${sidebarExists ? '✅' : '❌'}`);
    
    if (sidebarExists) {
      const sidebarWidth = await sidebar.evaluate(el => getComputedStyle(el).width);
      console.log(`   사이드바 너비: ${sidebarWidth}`);
      
      // 메뉴 항목들 확인
      const menuItems = page.locator('[data-testid^="sidebar-menu-item-"]');
      const menuCount = await menuItems.count();
      console.log(`   메뉴 항목 수: ${menuCount}개`);
      
      for (let i = 0; i < menuCount; i++) {
        const menuItem = menuItems.nth(i);
        const menuText = await menuItem.textContent();
        const isActive = await menuItem.getAttribute('class');
        console.log(`   - ${menuText?.trim()} ${isActive?.includes('active') ? '(활성)' : ''}`);
      }
    }
    
    // 헤더 확인
    const header = page.locator('header');
    const headerExists = await header.isVisible();
    console.log(`   헤더 존재: ${headerExists ? '✅' : '❌'}`);
    
    if (headerExists) {
      // 알림 벨 확인
      const notificationBell = page.locator('[data-testid="header-notification-bell"]');
      const bellExists = await notificationBell.isVisible();
      console.log(`   알림 시스템: ${bellExists ? '✅' : '❌'}`);
      
      if (bellExists) {
        const notificationCount = await notificationBell.locator('span').last().textContent();
        console.log(`   읽지 않은 알림: ${notificationCount}개`);
      }
    }
    
    // 3. 메인 콘텐츠 분석
    console.log('\n📊 3단계: 메인 콘텐츠 분석');
    
    // 로딩 상태 확인
    const loadingIndicator = page.locator('text=대시보드를 불러오는 중');
    const isLoading = await loadingIndicator.isVisible();
    console.log(`   현재 로딩 상태: ${isLoading ? '로딩 중' : '로딩 완료'}`);
    
    if (isLoading) {
      console.log('   ⏳ 대시보드가 로딩 중입니다. 5초 대기...');
      await page.waitForTimeout(5000);
      
      const stillLoading = await loadingIndicator.isVisible();
      console.log(`   5초 후 상태: ${stillLoading ? '여전히 로딩 중' : '로딩 완료'}`);
    }
    
    // 4. 색상 및 테마 분석
    console.log('\n🎨 4단계: 색상 및 디자인 시스템 분석');
    
    // 메인 브랜드 색상 확인
    const brandElement = page.locator('h1').first();
    if (await brandElement.isVisible()) {
      const brandColor = await brandElement.evaluate(el => getComputedStyle(el).color);
      console.log(`   브랜드 색상: ${brandColor}`);
    }
    
    // 배경색 확인
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    console.log(`   전체 배경색: ${bodyBg}`);
    
    // 카드 스타일 확인
    const cards = page.locator('.bg-white.border');
    const cardCount = await cards.count();
    console.log(`   카드형 컴포넌트: ${cardCount}개`);
    
    // 5. 반응형 디자인 테스트
    console.log('\n📱 5단계: 반응형 디자인 검증');
    
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    
    const sidebarMobile = await sidebar.isVisible();
    console.log(`   모바일에서 사이드바: ${sidebarMobile ? '표시됨' : '숨겨짐'}`);
    
    // 백드롭 확인
    const backdrop = page.locator('[data-testid="sidebar-backdrop"]');
    const backdropVisible = await backdrop.isVisible();
    console.log(`   모바일 백드롭: ${backdropVisible ? '활성' : '비활성'}`);
    
    // 데스크톱으로 복원
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // 6. 접근성 기본 검증
    console.log('\n♿ 6단계: 접근성 기본 검증');
    
    // 키보드 네비게이션 확인
    const focusableElements = await page.locator('button, a, input, [tabindex="0"]').count();
    console.log(`   포커스 가능한 요소: ${focusableElements}개`);
    
    // ARIA 라벨 확인
    const ariaLabels = await page.locator('[aria-label]').count();
    console.log(`   ARIA 라벨 적용: ${ariaLabels}개`);
    
    // 7. 스크린샷 캡처
    console.log('\n📸 7단계: 스크린샷 생성');
    
    await page.screenshot({
      path: 'dashboard-analysis-full.png',
      fullPage: true
    });
    console.log('   전체 페이지 스크린샷: dashboard-analysis-full.png');
    
    // 사이드바만 캡처
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({ path: 'dashboard-analysis-sidebar.png' });
      console.log('   사이드바 스크린샷: dashboard-analysis-sidebar.png');
    }
    
    // 메인 콘텐츠 영역만 캡처
    const mainContent = page.locator('main').last();
    if (await mainContent.isVisible()) {
      await mainContent.screenshot({ path: 'dashboard-analysis-content.png' });
      console.log('   메인 콘텐츠 스크린샷: dashboard-analysis-content.png');
    }
    
    console.log('\n✅ 대시보드 UI/UX 분석 완료!');
    
  } catch (error) {
    console.error('❌ 분석 중 오류 발생:', error.message);
  } finally {
    await browser.close();
  }
})();