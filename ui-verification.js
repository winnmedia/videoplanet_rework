/**
 * UI 검증 스크립트
 * 실제 사용자가 보는 화면을 캡처하고 문제점을 분석합니다.
 */

const { chromium } = require('playwright');

async function main() {
  console.log('🚀 UI 검증 시작...');
  
  const browser = await chromium.launch({ 
    headless: true, // 헤드리스 모드로 실행
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // 권한 문제 해결
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📱 1. 대시보드 페이지 접근...');
    await page.goto('http://localhost:3000/dashboard', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    // 페이지가 완전히 로드될 때까지 대기
    await page.waitForTimeout(2000);
    
    // 초기 화면 캡처
    await page.screenshot({ 
      path: 'test-results/ui-audit/dashboard-initial.png', 
      fullPage: true 
    });
    console.log('✅ 대시보드 초기 화면 캡처 완료');
    
    console.log('🖱️  2. 프로젝트 관리 메뉴 클릭...');
    // 프로젝트 관리 메뉴 클릭
    await page.click('[data-testid="menu-projects"]');
    await page.waitForTimeout(1000);
    
    // 서브메뉴 열린 후 화면 캡처
    await page.screenshot({ 
      path: 'test-results/ui-audit/dashboard-submenu-open.png', 
      fullPage: true 
    });
    console.log('✅ 서브메뉴 열린 상태 캡처 완료');
    
    console.log('📋 3. 프로젝트 페이지 이동...');
    await page.goto('http://localhost:3000/projects');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/ui-audit/projects-page.png', 
      fullPage: true 
    });
    console.log('✅ 프로젝트 페이지 캡처 완료');
    
    console.log('🎬 4. 영상 피드백 페이지 이동...');
    await page.goto('http://localhost:3000/feedback');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/ui-audit/feedback-page.png', 
      fullPage: true 
    });
    console.log('✅ 영상 피드백 페이지 캡처 완료');
    
    console.log('📱 5. 모바일 뷰포트 테스트...');
    await context.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/ui-audit/dashboard-mobile.png', 
      fullPage: true 
    });
    console.log('✅ 모바일 대시보드 캡처 완료');
    
    // 사이드바 레이아웃 확인
    console.log('🔍 6. 사이드바 레이아웃 분석...');
    const sidebar = await page.$('[data-testid="sidebar"]');
    if (sidebar) {
      const sidebarBox = await sidebar.boundingBox();
      console.log('사이드바 위치 및 크기:', sidebarBox);
      
      // 사이드바가 메인 콘텐츠를 가리는지 확인
      const mainContent = await page.$('.main-content');
      if (mainContent) {
        const mainBox = await mainContent.boundingBox();
        console.log('메인 콘텐츠 위치 및 크기:', mainBox);
        
        if (sidebarBox && mainBox && sidebarBox.x + sidebarBox.width > mainBox.x) {
          console.log('⚠️  사이드바가 메인 콘텐츠를 가리고 있을 수 있습니다.');
        }
      }
    }
    
    console.log('✨ UI 검증 완료!');
    console.log('📁 스크린샷이 test-results/ui-audit/ 폴더에 저장되었습니다.');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);