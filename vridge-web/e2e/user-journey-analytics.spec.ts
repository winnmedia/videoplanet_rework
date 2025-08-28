/**
 * 사용자 여정 데이터 수집 자동화 테스트
 * Playwright를 활용한 UX 메트릭 수집 및 분석
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

interface UserJourneyMetrics {
  journeyId: string;
  startTime: number;
  endTime: number;
  totalDuration: number;
  steps: Array<{
    stepName: string;
    startTime: number;
    duration: number;
    success: boolean;
    errors: string[];
    performanceMetrics: {
      lcp: number;
      fid: number;
      cls: number;
    };
    interactions: Array<{
      type: string;
      element: string;
      timestamp: number;
    }>;
  }>;
  completionRate: number;
  abandonmentPoint?: string;
  userFrustrationEvents: Array<{
    type: string;
    timestamp: number;
    context: Record<string, unknown>;
  }>;
}

class UserJourneyAnalyzer {
  private metrics: UserJourneyMetrics;
  private page: Page;
  private context: BrowserContext;

  constructor(page: Page, context: BrowserContext, journeyId: string) {
    this.page = page;
    this.context = context;
    this.metrics = {
      journeyId,
      startTime: Date.now(),
      endTime: 0,
      totalDuration: 0,
      steps: [],
      completionRate: 0,
      userFrustrationEvents: []
    };
  }

  // 성능 메트릭 수집
  async collectPerformanceMetrics(): Promise<{ lcp: number; fid: number; cls: number }> {
    const metrics = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics = { lcp: 0, fid: 0, cls: 0 };
        
        // LCP 측정
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.lcp = lastEntry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // CLS 측정
        new PerformanceObserver((list) => {
          let clsValue = 0;
          list.getEntries().forEach(entry => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          });
          metrics.cls = clsValue;
        }).observe({ type: 'layout-shift', buffered: true });

        // 측정 완료 후 반환
        setTimeout(() => resolve(metrics), 1000);
      });
    });

    return metrics;
  }

  // 사용자 상호작용 추적
  async trackInteractions(stepName: string): Promise<void> {
    await this.page.addInitScript(() => {
      window.journeyInteractions = [];
      
      ['click', 'input', 'scroll', 'keydown'].forEach(eventType => {
        document.addEventListener(eventType, (event) => {
          window.journeyInteractions.push({
            type: eventType,
            element: event.target?.tagName + (event.target?.id ? '#' + event.target.id : ''),
            timestamp: Date.now(),
            details: {
              key: event.type === 'keydown' ? (event as KeyboardEvent).key : undefined,
              scrollY: eventType === 'scroll' ? window.scrollY : undefined
            }
          });
        });
      });
    });
  }

  // 여정 단계 시작
  async startStep(stepName: string): Promise<void> {
    await this.trackInteractions(stepName);
    
    const stepStart = {
      stepName,
      startTime: Date.now(),
      duration: 0,
      success: false,
      errors: [],
      performanceMetrics: { lcp: 0, fid: 0, cls: 0 },
      interactions: []
    };
    
    this.metrics.steps.push(stepStart);
  }

  // 여정 단계 완료
  async completeStep(stepName: string, success: boolean = true): Promise<void> {
    const currentStep = this.metrics.steps.find(step => step.stepName === stepName && !step.success);
    if (!currentStep) return;

    const endTime = Date.now();
    currentStep.duration = endTime - currentStep.startTime;
    currentStep.success = success;
    currentStep.performanceMetrics = await this.collectPerformanceMetrics();
    
    // 상호작용 데이터 수집
    const interactions = await this.page.evaluate(() => window.journeyInteractions || []);
    currentStep.interactions = interactions;

    // 에러 수집
    const errors = await this.page.evaluate(() => {
      const errors: string[] = [];
      const errorEvents = window.journeyErrors || [];
      return errorEvents.map((e: any) => e.message);
    });
    currentStep.errors = errors;
  }

  // 좌절 상황 감지
  async detectFrustration(): Promise<void> {
    // 연속 클릭 감지
    const rapidClicks = await this.page.evaluate(() => {
      const interactions = window.journeyInteractions || [];
      const clicks = interactions.filter(i => i.type === 'click');
      
      let rapidClickCount = 0;
      for (let i = 1; i < clicks.length; i++) {
        if (clicks[i].timestamp - clicks[i-1].timestamp < 500) {
          rapidClickCount++;
        }
      }
      return rapidClickCount;
    });

    if (rapidClicks > 3) {
      this.metrics.userFrustrationEvents.push({
        type: 'rapid_clicks',
        timestamp: Date.now(),
        context: { clickCount: rapidClicks }
      });
    }
  }

  // 여정 완료 및 결과 저장
  async completeJourney(completionRate: number): Promise<UserJourneyMetrics> {
    this.metrics.endTime = Date.now();
    this.metrics.totalDuration = this.metrics.endTime - this.metrics.startTime;
    this.metrics.completionRate = completionRate;

    await this.detectFrustration();

    // 결과를 API에 전송
    await this.page.request.post('/api/analytics/user-journey', {
      data: this.metrics
    });

    return this.metrics;
  }
}

// 주요 사용자 여정 시나리오들
test.describe('사용자 여정 데이터 수집', () => {
  
  test('프로젝트 생성 여정 분석', async ({ page, context }) => {
    const analyzer = new UserJourneyAnalyzer(page, context, 'project_creation_journey');
    
    await page.goto('/dashboard');
    await analyzer.startStep('dashboard_landing');
    
    // Dashboard 랜딩 완료
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await analyzer.completeStep('dashboard_landing', true);
    
    // Projects 페이지로 이동
    await analyzer.startStep('navigate_to_projects');
    await page.click('[data-testid="sidebar-projects"]');
    await expect(page).toHaveURL('/projects');
    await analyzer.completeStep('navigate_to_projects', true);
    
    // 프로젝트 생성 버튼 클릭
    await analyzer.startStep('click_create_project');
    await page.click('[data-testid="create-project-button"]');
    await expect(page).toHaveURL('/projects/create');
    await analyzer.completeStep('click_create_project', true);
    
    // 프로젝트 정보 입력
    await analyzer.startStep('fill_project_form');
    await page.fill('[data-testid="project-name"]', '테스트 프로젝트');
    await page.fill('[data-testid="project-description"]', '테스트 설명');
    await page.selectOption('[data-testid="project-type"]', 'video');
    await analyzer.completeStep('fill_project_form', true);
    
    // 프로젝트 생성 완료
    await analyzer.startStep('submit_project');
    await page.click('[data-testid="submit-project"]');
    
    // 성공 여부 확인
    try {
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 5000 });
      await analyzer.completeStep('submit_project', true);
      
      const metrics = await analyzer.completeJourney(1.0); // 100% 완료
      
      // 성능 기준 검증
      expect(metrics.totalDuration).toBeLessThan(60000); // 1분 이내
      expect(metrics.steps.every(step => step.performanceMetrics.lcp < 2500)).toBeTruthy();
      
    } catch (error) {
      await analyzer.completeStep('submit_project', false);
      await analyzer.completeJourney(0.8); // 80% 완료 (마지막 단계 실패)
    }
  });

  test('비디오 피드백 여정 분석', async ({ page, context }) => {
    const analyzer = new UserJourneyAnalyzer(page, context, 'video_feedback_journey');
    
    await page.goto('/feedback');
    await analyzer.startStep('feedback_page_load');
    
    await expect(page.locator('[data-testid="feedback-list"]')).toBeVisible();
    await analyzer.completeStep('feedback_page_load', true);
    
    // 피드백 항목 선택
    await analyzer.startStep('select_feedback_item');
    await page.click('[data-testid="feedback-item"]:first-child');
    await expect(page.locator('[data-testid="video-player"]')).toBeVisible();
    await analyzer.completeStep('select_feedback_item', true);
    
    // 비디오 재생
    await analyzer.startStep('play_video');
    await page.click('[data-testid="play-button"]');
    
    // 5초 대기 (비디오 로딩 시간)
    await page.waitForTimeout(5000);
    
    const isPlaying = await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      return video && !video.paused;
    });
    
    await analyzer.completeStep('play_video', isPlaying);
    
    // 타임라인 코멘트 추가
    await analyzer.startStep('add_timeline_comment');
    await page.click('[data-testid="timeline-marker"]');
    await page.fill('[data-testid="comment-input"]', '여기 수정이 필요합니다');
    await page.click('[data-testid="submit-comment"]');
    
    try {
      await expect(page.locator('[data-testid="comment-success"]')).toBeVisible({ timeout: 3000 });
      await analyzer.completeStep('add_timeline_comment', true);
      await analyzer.completeJourney(1.0);
    } catch {
      await analyzer.completeStep('add_timeline_comment', false);
      await analyzer.completeJourney(0.75);
    }
  });

  test('서브메뉴 사용 패턴 분석', async ({ page, context }) => {
    const analyzer = new UserJourneyAnalyzer(page, context, 'submenu_usage_journey');
    
    await page.goto('/projects');
    await analyzer.startStep('projects_page_load');
    
    await expect(page.locator('[data-testid="projects-page"]')).toBeVisible();
    await analyzer.completeStep('projects_page_load', true);
    
    // 서브메뉴 열기
    await analyzer.startStep('open_submenu');
    await page.click('[data-testid="projects-menu-button"]');
    await expect(page.locator('[data-testid="submenu"]')).toBeVisible();
    await analyzer.completeStep('open_submenu', true);
    
    // 서브메뉴 항목들 탐색
    await analyzer.startStep('explore_submenu_items');
    
    const menuItems = await page.locator('[data-testid^="menu-item-"]').count();
    
    // 여러 항목에 마우스 호버
    for (let i = 0; i < Math.min(3, menuItems); i++) {
      await page.hover(`[data-testid^="menu-item-"]:nth-child(${i + 1})`);
      await page.waitForTimeout(500); // 탐색 시간
    }
    
    await analyzer.completeStep('explore_submenu_items', true);
    
    // 항목 선택
    await analyzer.startStep('select_menu_item');
    await page.click('[data-testid^="menu-item-"]:first-child');
    
    // 페이지 변경 확인
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    const navigationSuccess = !currentUrl.includes('/projects') || 
                            page.locator('[data-testid="project-detail"]').isVisible();
    
    await analyzer.completeStep('select_menu_item', navigationSuccess);
    
    const completionRate = navigationSuccess ? 1.0 : 0.75;
    await analyzer.completeJourney(completionRate);
  });

  test('검색 및 필터링 여정 분석', async ({ page, context }) => {
    const analyzer = new UserJourneyAnalyzer(page, context, 'search_filter_journey');
    
    await page.goto('/projects');
    await analyzer.startStep('page_load');
    
    await expect(page.locator('[data-testid="projects-page"]')).toBeVisible();
    await analyzer.completeStep('page_load', true);
    
    // 검색 시도
    await analyzer.startStep('search_attempt');
    await page.fill('[data-testid="search-input"]', '테스트');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // 검색 결과 대기
    await page.waitForTimeout(2000);
    
    const searchResults = await page.locator('[data-testid="project-item"]').count();
    await analyzer.completeStep('search_attempt', searchResults >= 0);
    
    // 필터 적용
    await analyzer.startStep('apply_filters');
    await page.click('[data-testid="filter-dropdown"]');
    await page.click('[data-testid="filter-option-video"]');
    
    await page.waitForTimeout(1000);
    const filteredResults = await page.locator('[data-testid="project-item"]').count();
    await analyzer.completeStep('apply_filters', true);
    
    // 결과 확인 및 상호작용
    if (filteredResults > 0) {
      await analyzer.startStep('interact_with_results');
      await page.click('[data-testid="project-item"]:first-child');
      
      try {
        await expect(page.locator('[data-testid="project-detail"]')).toBeVisible({ timeout: 3000 });
        await analyzer.completeStep('interact_with_results', true);
        await analyzer.completeJourney(1.0);
      } catch {
        await analyzer.completeStep('interact_with_results', false);
        await analyzer.completeJourney(0.75);
      }
    } else {
      await analyzer.completeJourney(0.5); // 결과 없음
    }
  });
});

// 성능 회귀 테스트
test.describe('성능 회귀 분석', () => {
  test('페이지별 로딩 성능 기준선 설정', async ({ page }) => {
    const pages = ['/dashboard', '/projects', '/planning', '/feedback', '/calendar'];
    const performanceBaselines: Record<string, { lcp: number; fid: number; cls: number }> = {};
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const perfMetrics = { lcp: 0, fid: 0, cls: 0 };
          let metricsCollected = 0;
          
          new PerformanceObserver((list) => {
            const entry = list.getEntries()[0];
            perfMetrics.lcp = entry.startTime;
            metricsCollected++;
            if (metricsCollected === 2) resolve(perfMetrics);
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          
          new PerformanceObserver((list) => {
            let clsValue = 0;
            list.getEntries().forEach(entry => {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            });
            perfMetrics.cls = clsValue;
            metricsCollected++;
            if (metricsCollected === 2) resolve(perfMetrics);
          }).observe({ type: 'layout-shift', buffered: true });
          
          setTimeout(() => resolve(perfMetrics), 3000);
        });
      });
      
      performanceBaselines[pagePath] = metrics;
      
      // 성능 기준 검증
      expect(metrics.lcp).toBeLessThan(2500); // 2.5초 이내
      expect(metrics.cls).toBeLessThan(0.1);   // 0.1 이하
    }
    
    // 성능 데이터를 API로 전송
    await page.request.post('/api/analytics/performance-baselines', {
      data: { baselines: performanceBaselines, timestamp: Date.now() }
    });
  });
});

// 접근성 여정 분석
test.describe('접근성 사용자 여정 분석', () => {
  test('키보드 네비게이션 여정', async ({ page, context }) => {
    const analyzer = new UserJourneyAnalyzer(page, context, 'keyboard_navigation_journey');
    
    await page.goto('/dashboard');
    await analyzer.startStep('keyboard_navigation');
    
    // Tab 키로 네비게이션
    const tabSequence = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => {
        const element = document.activeElement;
        return element ? {
          tagName: element.tagName,
          id: element.id,
          'data-testid': element.getAttribute('data-testid'),
          'aria-label': element.getAttribute('aria-label')
        } : null;
      });
      
      if (focusedElement) {
        tabSequence.push(focusedElement);
      }
    }
    
    // 키보드 접근 가능한 요소들이 적절히 포커스되는지 확인
    const accessibleElements = tabSequence.filter(el => 
      el?.['data-testid'] || el?.['aria-label'] || 
      ['BUTTON', 'A', 'INPUT', 'SELECT'].includes(el?.tagName || '')
    );
    
    await analyzer.completeStep('keyboard_navigation', accessibleElements.length > 5);
    await analyzer.completeJourney(accessibleElements.length > 5 ? 1.0 : 0.5);
  });
});