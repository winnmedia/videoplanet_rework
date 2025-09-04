# MCP Playwright 기반 UI 테스트 - 서브메뉴 상태 확인
from playwright.sync_api import sync_playwright
import time

def test_sidebar_submenu_status():
    """서브메뉴 상태 및 페이지 기능 요소 확인"""
    with sync_playwright() as p:
        # 브라우저 시작
        browser = p.chromium.launch(headless=False, slow_mo=500)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()
        
        try:
            # 개발 서버 접속
            page.goto('http://localhost:3000', wait_until='networkidle')
            print("✓ 페이지 로드 완료")
            
            # 사이드바 확인
            sidebar = page.locator('[data-testid="sidebar"]')
            if sidebar.is_visible():
                print("✓ 사이드바가 표시됨")
                
                # 메뉴 아이템들 확인
                menu_items = [
                    ('menu-home', '홈'),
                    ('menu-calendar', '전체 일정'),
                    ('menu-projects', '프로젝트 관리'),
                    ('menu-planning', '영상 기획'),
                    ('menu-feedback', '영상 피드백')
                ]
                
                for menu_id, menu_name in menu_items:
                    menu_btn = page.locator(f'[data-testid="{menu_id}"]')
                    if menu_btn.is_visible():
                        print(f"✓ {menu_name} 메뉴 발견")
                        
                        # 프로젝트 메뉴에서 서브메뉴 테스트
                        if menu_id == 'menu-projects':
                            print("  프로젝트 메뉴 클릭하여 서브메뉴 테스트...")
                            menu_btn.click()
                            time.sleep(1)
                            
                            # 서브메뉴 확인
                            submenu = page.locator('[data-testid="sidebar-submenu"]')
                            if submenu.is_visible():
                                print("  ✓ 서브메뉴가 표시됨")
                                
                                # 서브메뉴 항목들 확인
                                submenu_items = submenu.locator('[data-testid*="menu-item-"]')
                                count = submenu_items.count()
                                print(f"  - 서브메뉴 항목 수: {count}개")
                                
                                if count == 0:
                                    print("  ⚠️ 서브메뉴 항목이 없음 (빈 상태)")
                                
                            else:
                                print("  ❌ 서브메뉴가 표시되지 않음")
                    else:
                        print(f"❌ {menu_name} 메뉴를 찾을 수 없음")
            else:
                print("❌ 사이드바가 표시되지 않음")
            
            # 각 페이지의 기능 요소 확인
            pages_to_check = [
                ('/dashboard', '대시보드'),
                ('/projects', '프로젝트'),
                ('/calendar', '캘린더'),
                ('/planning', '영상 기획'),
                ('/feedback', '영상 피드백')
            ]
            
            for path, name in pages_to_check:
                print(f"\n--- {name} 페이지 확인 ---")
                page.goto(f'http://localhost:3000{path}', wait_until='networkidle')
                time.sleep(1)
                
                # 페이지 제목 확인
                title = page.locator('h1').first
                if title.is_visible():
                    title_text = title.text_content()
                    print(f"✓ 페이지 제목: {title_text}")
                else:
                    print("❌ 페이지 제목을 찾을 수 없음")
                
                # 기능 요소들 확인 (버튼, 폼, 카드 등)
                interactive_elements = page.locator('button, input, select, textarea, [role="button"]')
                element_count = interactive_elements.count()
                print(f"- 상호작용 요소 수: {element_count}개")
                
                if element_count == 0:
                    print("  ❌ 기능 요소가 전혀 없음")
                else:
                    # 상위 5개 요소의 정보 출력
                    for i in range(min(5, element_count)):
                        element = interactive_elements.nth(i)
                        if element.is_visible():
                            text = element.text_content() or element.get_attribute('aria-label') or element.get_attribute('placeholder') or 'Unknown'
                            tag = element.evaluate('el => el.tagName.toLowerCase()')
                            print(f"  ✓ {tag}: {text[:30]}...")
                
                # 에러 메시지 확인
                error_elements = page.locator('.error, [role="alert"], .text-red-500, .text-red-600')
                error_count = error_elements.count()
                if error_count > 0:
                    print(f"⚠️ 에러 메시지 {error_count}개 발견")
                    for i in range(min(3, error_count)):
                        error_text = error_elements.nth(i).text_content()
                        if error_text:
                            print(f"  - {error_text}")
        
        except Exception as e:
            print(f"❌ 테스트 중 오류 발생: {e}")
        
        finally:
            browser.close()
            print("\n테스트 완료")

# 테스트 실행
if __name__ == "__main__":
    test_sidebar_submenu_status()