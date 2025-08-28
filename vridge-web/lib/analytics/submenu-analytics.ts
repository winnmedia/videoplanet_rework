/**
 * 서브메뉴 사용 패턴 분석 시스템
 * VRidge 특화 서브메뉴 UX 개선을 위한 데이터 수집
 */

import { behaviorTracker } from './behavior-tracker';

export interface SubMenuUsageMetrics {
  menuType: string;
  openTime: number;
  closeTime: number;
  duration: number;
  itemsViewed: string[];
  itemClicked?: string;
  scrollDepth: number;
  keyboardNavUsed: boolean;
  exitMethod: 'click_item' | 'click_outside' | 'escape_key' | 'close_button';
}

export class SubMenuAnalytics {
  private activeMenus: Map<string, {
    openTime: number;
    itemsViewed: Set<string>;
    maxScrollDepth: number;
    keyboardUsed: boolean;
  }> = new Map();

  // 서브메뉴 열림 추적
  trackMenuOpen(menuType: string, trigger: 'click' | 'keyboard' | 'hover'): void {
    const menuId = `${menuType}_${Date.now()}`;
    
    this.activeMenus.set(menuId, {
      openTime: Date.now(),
      itemsViewed: new Set(),
      maxScrollDepth: 0,
      keyboardUsed: trigger === 'keyboard'
    });

    behaviorTracker.trackSubMenuUsage('open', {
      menuType,
      openDuration: 0
    });

    // 스크롤 추적 시작
    this.trackMenuScroll(menuId);
  }

  // 서브메뉴 항목 조회 추적
  trackItemView(menuType: string, itemId: string, itemName: string, viewMethod: 'hover' | 'keyboard_focus'): void {
    const activeMenu = Array.from(this.activeMenus.entries())
      .find(([_, data]) => data.openTime > Date.now() - 30000); // 30초 내 열린 메뉴

    if (activeMenu) {
      const [menuId, menuData] = activeMenu;
      menuData.itemsViewed.add(itemId);
      
      if (viewMethod === 'keyboard_focus') {
        menuData.keyboardUsed = true;
      }
    }

    behaviorTracker.track({
      category: 'interaction',
      action: 'submenu_item_view',
      component: 'SubMenu',
      element: itemId,
      customProperties: {
        menuType,
        itemName,
        viewMethod,
        itemsViewedCount: activeMenu?.[1].itemsViewed.size || 0
      }
    });
  }

  // 서브메뉴 항목 클릭 추적
  trackItemClick(menuType: string, itemId: string, itemName: string, clickPosition: { x: number; y: number }): void {
    const activeMenuEntry = Array.from(this.activeMenus.entries())
      .find(([_, data]) => data.openTime > Date.now() - 30000);

    if (activeMenuEntry) {
      const [menuId, menuData] = activeMenuEntry;
      const duration = Date.now() - menuData.openTime;
      
      this.completeMenuSession(menuId, {
        menuType,
        duration,
        itemsViewed: Array.from(menuData.itemsViewed),
        itemClicked: itemId,
        exitMethod: 'click_item',
        scrollDepth: menuData.maxScrollDepth,
        keyboardNavUsed: menuData.keyboardUsed
      });
    }

    behaviorTracker.trackSubMenuUsage('item_click', {
      menuType,
      itemId,
      itemName
    });
  }

  // 서브메뉴 닫힘 추적
  trackMenuClose(menuType: string, closeMethod: 'click_outside' | 'escape_key' | 'close_button'): void {
    const activeMenuEntry = Array.from(this.activeMenus.entries())
      .find(([_, data]) => data.openTime > Date.now() - 30000);

    if (activeMenuEntry) {
      const [menuId, menuData] = activeMenuEntry;
      const duration = Date.now() - menuData.openTime;
      
      this.completeMenuSession(menuId, {
        menuType,
        duration,
        itemsViewed: Array.from(menuData.itemsViewed),
        exitMethod: closeMethod,
        scrollDepth: menuData.maxScrollDepth,
        keyboardNavUsed: menuData.keyboardUsed
      });
    }

    behaviorTracker.trackSubMenuUsage('close', {
      menuType,
      openDuration: activeMenuEntry ? Date.now() - activeMenuEntry[1].openTime : 0
    });
  }

  // 메뉴 세션 완료 처리
  private completeMenuSession(menuId: string, metrics: Omit<SubMenuUsageMetrics, 'openTime' | 'closeTime'>): void {
    const menuData = this.activeMenus.get(menuId);
    if (!menuData) return;

    const fullMetrics: SubMenuUsageMetrics = {
      ...metrics,
      openTime: menuData.openTime,
      closeTime: Date.now()
    };

    // 종합 분석 데이터 전송
    behaviorTracker.track({
      category: 'engagement',
      action: 'submenu_session_complete',
      component: 'SubMenu',
      value: fullMetrics.duration,
      customProperties: {
        metrics: fullMetrics,
        efficiency: this.calculateMenuEfficiency(fullMetrics),
        usabilityScore: this.calculateUsabilityScore(fullMetrics)
      }
    });

    this.activeMenus.delete(menuId);
  }

  // 스크롤 깊이 추적
  private trackMenuScroll(menuId: string): void {
    const menuElement = document.querySelector('[data-testid="submenu"]');
    if (!menuElement) return;

    const scrollHandler = () => {
      const menuData = this.activeMenus.get(menuId);
      if (!menuData) return;

      const scrollDepth = (menuElement.scrollTop / (menuElement.scrollHeight - menuElement.clientHeight)) * 100;
      menuData.maxScrollDepth = Math.max(menuData.maxScrollDepth, scrollDepth);
    };

    menuElement.addEventListener('scroll', scrollHandler);
    
    // 메뉴 닫힘 시 리스너 제거
    setTimeout(() => {
      menuElement.removeEventListener('scroll', scrollHandler);
    }, 30000);
  }

  // 메뉴 효율성 계산 (클릭률 기반)
  private calculateMenuEfficiency(metrics: SubMenuUsageMetrics): number {
    if (metrics.itemsViewed.length === 0) return 0;
    return metrics.itemClicked ? (1 / metrics.itemsViewed.length) * 100 : 0;
  }

  // 사용성 점수 계산
  private calculateUsabilityScore(metrics: SubMenuUsageMetrics): number {
    let score = 100;
    
    // 체류 시간이 너무 길거나 짧으면 감점
    if (metrics.duration < 1000) score -= 20; // 1초 미만
    if (metrics.duration > 30000) score -= 30; // 30초 초과
    
    // 많은 항목을 봤는데 클릭하지 않으면 감점
    if (metrics.itemsViewed.length > 3 && !metrics.itemClicked) score -= 25;
    
    // 키보드 네비게이션 사용 시 가점
    if (metrics.keyboardNavUsed) score += 10;
    
    // 적절한 스크롤 사용 시 가점
    if (metrics.scrollDepth > 20 && metrics.scrollDepth < 80) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }
}

export const subMenuAnalytics = new SubMenuAnalytics();

// React Hook
export function useSubMenuAnalytics() {
  return {
    trackMenuOpen: subMenuAnalytics.trackMenuOpen.bind(subMenuAnalytics),
    trackItemView: subMenuAnalytics.trackItemView.bind(subMenuAnalytics),
    trackItemClick: subMenuAnalytics.trackItemClick.bind(subMenuAnalytics),
    trackMenuClose: subMenuAnalytics.trackMenuClose.bind(subMenuAnalytics)
  };
}