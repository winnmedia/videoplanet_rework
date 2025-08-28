/**
 * 사용자 행동 추적 시스템
 * UX/UI 개선을 위한 데이터 수집 및 분석
 */

import { z } from 'zod';
import { UserBehaviorEventSchema, NavigationEventSchema, InteractionEventSchema } from '@/shared/api/schemas';

type UserBehaviorEvent = z.infer<typeof UserBehaviorEventSchema>;
type NavigationEvent = z.infer<typeof NavigationEventSchema>;
type InteractionEvent = z.infer<typeof InteractionEventSchema>;

export class BehaviorTracker {
  private sessionId: string;
  private queue: UserBehaviorEvent[] = [];
  private batchSize = 10;
  private flushInterval = 30000; // 30초
  private currentPage: string;
  private pageStartTime: number;
  private isTracking = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.currentPage = typeof window !== 'undefined' ? window.location.pathname : '';
    this.pageStartTime = Date.now();
    
    if (typeof window !== 'undefined') {
      this.initializeTracking();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracking(): void {
    // 페이지 이탈 시 데이터 전송
    window.addEventListener('beforeunload', () => {
      this.flush(true); // 동기 전송
    });

    // 주기적 배치 전송
    setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);

    // 네비게이션 추적
    this.trackPageNavigation();
    
    // 클릭 이벤트 추적
    this.trackClickEvents();
    
    // 스크롤 추적
    this.trackScrollEvents();
    
    // 폼 상호작용 추적
    this.trackFormInteractions();
    
    // 비디오 상호작용 추적 (VideoPlanet 특화)
    this.trackVideoInteractions();
  }

  // 1. 네비게이션 이벤트 추적
  private trackPageNavigation(): void {
    let previousPage = this.currentPage;

    const observer = new MutationObserver(() => {
      const newPage = window.location.pathname;
      if (newPage !== this.currentPage) {
        // 이전 페이지 체류 시간 기록
        this.track({
          category: 'engagement',
          action: 'page_exit',
          page: this.currentPage,
          value: Date.now() - this.pageStartTime,
          customProperties: {
            timeOnPage: Date.now() - this.pageStartTime,
            exitMethod: 'navigation'
          }
        });

        // 새 페이지 진입 기록
        this.track({
          category: 'navigation',
          action: 'page_view',
          page: newPage,
          previousPage: this.currentPage,
          customProperties: {
            navigationType: 'spa_navigation'
          }
        } as NavigationEvent);

        previousPage = this.currentPage;
        this.currentPage = newPage;
        this.pageStartTime = Date.now();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 2. 서브메뉴 사용 패턴 추적 (VRidge 특화)
  trackSubMenuUsage(action: 'open' | 'close' | 'item_click', details: {
    menuType: string;
    itemId?: string;
    itemName?: string;
    openDuration?: number;
  }): void {
    this.track({
      category: 'interaction',
      action: `submenu_${action}`,
      component: 'SubMenu',
      label: details.menuType,
      value: details.openDuration,
      customProperties: {
        menuType: details.menuType,
        itemId: details.itemId,
        itemName: details.itemName,
        openDuration: details.openDuration
      }
    });
  }

  // 3. 비디오 상호작용 추적 (VideoPlanet 특화)
  private trackVideoInteractions(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const videoContainer = target.closest('[data-testid*="video"]');
      
      if (videoContainer) {
        this.track({
          category: 'interaction',
          action: 'video_interaction',
          component: 'VideoPlayer',
          element: target.tagName.toLowerCase(),
          customProperties: {
            videoId: videoContainer.getAttribute('data-video-id'),
            action: this.getVideoAction(target),
            timestamp: this.getVideoCurrentTime(videoContainer)
          }
        });
      }
    });
  }

  // 4. 프로젝트/피드백 워크플로우 추적
  trackWorkflowStep(workflow: 'project_creation' | 'feedback_submission' | 'video_planning', step: string, data: Record<string, unknown>): void {
    this.track({
      category: 'engagement',
      action: `${workflow}_step`,
      label: step,
      customProperties: {
        workflow,
        step,
        stepData: data,
        stepStartTime: Date.now()
      }
    });
  }

  // 5. 성능 영향 이벤트 추적
  trackPerformanceImpact(metric: string, value: number, threshold: number): void {
    if (value > threshold) {
      this.track({
        category: 'performance',
        action: 'threshold_exceeded',
        label: metric,
        value,
        customProperties: {
          metric,
          actualValue: value,
          threshold,
          impact: value > threshold * 1.5 ? 'high' : 'medium'
        }
      });
    }
  }

  // 6. 에러/문제 상황 추적
  trackUserFrustration(frustrationEvent: {
    type: 'rapid_clicks' | 'repeated_navigation' | 'form_errors' | 'timeout';
    context: Record<string, unknown>;
  }): void {
    this.track({
      category: 'error',
      action: 'user_frustration',
      label: frustrationEvent.type,
      customProperties: {
        frustrationType: frustrationEvent.type,
        context: frustrationEvent.context,
        severity: this.calculateFrustrationSeverity(frustrationEvent)
      }
    });
  }

  // 공통 추적 메서드
  private track(eventData: Partial<UserBehaviorEvent>): void {
    if (!this.isTracking) return;

    try {
      const event: UserBehaviorEvent = {
        eventId: crypto.randomUUID(),
        sessionId: this.sessionId,
        userId: this.getCurrentUserId(),
        timestamp: new Date().toISOString(),
        page: this.currentPage,
        device: this.getDeviceInfo(),
        referrer: document.referrer,
        timeOnPage: Date.now() - this.pageStartTime,
        ...eventData
      } as UserBehaviorEvent;

      // 스키마 검증
      const validatedEvent = UserBehaviorEventSchema.parse(event);
      
      this.queue.push(validatedEvent);

      // 큐가 가득 차면 즉시 전송
      if (this.queue.length >= this.batchSize) {
        this.flush();
      }
    } catch (error) {
      console.warn('행동 추적 데이터 검증 실패:', error);
    }
  }

  // 배치 전송
  private async flush(synchronous = false): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      if (synchronous && navigator.sendBeacon) {
        // 페이지 이탈 시 동기 전송
        navigator.sendBeacon('/api/analytics/events', JSON.stringify({ events }));
      } else {
        // 일반적인 비동기 전송
        await fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }),
          keepalive: true
        });
      }
    } catch (error) {
      console.warn('행동 추적 데이터 전송 실패:', error);
      // 실패한 이벤트는 다시 큐에 추가 (선택적)
      this.queue.unshift(...events);
    }
  }

  // 유틸리티 메서드들
  private getDeviceInfo() {
    return {
      type: this.getDeviceType(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      userAgent: navigator.userAgent
    };
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getCurrentUserId(): string | undefined {
    // Redux store나 로컬 스토리지에서 사용자 ID 가져오기
    return undefined; // 구현 필요
  }

  private getVideoAction(element: HTMLElement): string {
    if (element.getAttribute('aria-label')?.includes('play')) return 'play';
    if (element.getAttribute('aria-label')?.includes('pause')) return 'pause';
    if (element.closest('.video-timeline')) return 'seek';
    return 'unknown';
  }

  private getVideoCurrentTime(container: Element): number {
    const video = container.querySelector('video') as HTMLVideoElement;
    return video?.currentTime || 0;
  }

  private calculateFrustrationSeverity(event: { type: string; context: Record<string, unknown> }): 'low' | 'medium' | 'high' {
    // 좌절 심각도 계산 로직
    if (event.type === 'rapid_clicks' && (event.context.clickCount as number) > 5) return 'high';
    if (event.type === 'repeated_navigation' && (event.context.attemptCount as number) > 3) return 'high';
    return 'medium';
  }

  // 추적 제어
  public startTracking(): void {
    this.isTracking = true;
  }

  public stopTracking(): void {
    this.isTracking = false;
    this.flush(true); // 중단 전 데이터 전송
  }

  public getSessionId(): string {
    return this.sessionId;
  }
}

// 싱글톤 인스턴스
export const behaviorTracker = new BehaviorTracker();

// React Hook
export function useBehaviorTracker() {
  return behaviorTracker;
}