/**
 * 🚀 통합 성능 모니터링 시스템
 * Core Web Vitals + 커스텀 메트릭 실시간 수집 및 분석
 */

// ========================================
// 타입 정의
// ========================================
export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null;  // Largest Contentful Paint
  fid: number | null;  // First Input Delay  
  cls: number | null;  // Cumulative Layout Shift
  fcp: number | null;  // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  
  // 커스텀 메트릭
  pageLoadTime: number | null;
  domContentLoaded: number | null;
  videoLoadTime: number | null;
  apiResponseTime: number | null;
  renderTime: number | null;
  
  // 컨텍스트 정보
  url: string;
  userAgent: string;
  connectionType: string;
  timestamp: number;
  sessionId: string;
}

export interface PerformanceBudget {
  lcp: number;     // 2500ms
  fid: number;     // 100ms
  cls: number;     // 0.1
  fcp: number;     // 1800ms
  ttfb: number;    // 800ms
  pageLoadTime: number; // 3000ms
}

export interface PerformanceAlert {
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: number;
  url: string;
}

// ========================================
// 성능 모니터링 클래스
// ========================================
export class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private budget: PerformanceBudget;
  private observers: Map<string, PerformanceObserver> = new Map();
  private sessionId: string;
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];
  
  constructor(budget?: Partial<PerformanceBudget>) {
    this.budget = {
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      fcp: 1800,
      ttfb: 800,
      pageLoadTime: 3000,
      ...budget
    };
    
    this.sessionId = this.generateSessionId();
    this.initializeMonitoring();
  }

  // ========================================
  // 초기화 및 기본 설정
  // ========================================
  private generateSessionId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;

    // 기본 정보 수집
    this.metrics.url = window.location.href;
    this.metrics.userAgent = navigator.userAgent;
    this.metrics.connectionType = this.getConnectionType();
    this.metrics.timestamp = Date.now();
    this.metrics.sessionId = this.sessionId;

    // Core Web Vitals 모니터링 시작
    this.initializeCoreWebVitals();
    
    // 커스텀 메트릭 모니터링 시작
    this.initializeCustomMetrics();
    
    // 페이지 언로드 시 메트릭 전송
    this.setupBeaconReporting();
  }

  // ========================================
  // Core Web Vitals 모니터링
  // ========================================
  private initializeCoreWebVitals(): void {
    // LCP (Largest Contentful Paint) 모니터링
    this.observeMetric('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = Math.round(lastEntry.startTime);
      this.checkBudget('lcp', this.metrics.lcp);
    });

    // FID (First Input Delay) 모니터링
    this.observeMetric('first-input', (entries) => {
      const firstEntry = entries[0] as PerformanceEventTiming;
      this.metrics.fid = Math.round(firstEntry.processingStart - firstEntry.startTime);
      this.checkBudget('fid', this.metrics.fid);
    });

    // CLS (Cumulative Layout Shift) 모니터링
    this.observeMetric('layout-shift', (entries) => {
      let clsValue = 0;
      entries.forEach(entry => {
        const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value || 0;
        }
      });
      this.metrics.cls = Math.round(clsValue * 1000) / 1000;
      this.checkBudget('cls', this.metrics.cls);
    });

    // FCP (First Contentful Paint) 모니터링
    this.observeMetric('paint', (entries) => {
      entries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = Math.round(entry.startTime);
          this.checkBudget('fcp', this.metrics.fcp);
        }
      });
    });

    // Navigation Timing으로 TTFB 측정
    if (performance.getEntriesByType) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.metrics.ttfb = Math.round(navigation.responseStart - navigation.requestStart);
        this.checkBudget('ttfb', this.metrics.ttfb);
      }
    }
  }

  // ========================================
  // 커스텀 메트릭 모니터링
  // ========================================
  private initializeCustomMetrics(): void {
    // 페이지 로드 시간
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.metrics.pageLoadTime = Math.round(navigation.loadEventEnd - navigation.fetchStart);
        this.metrics.domContentLoaded = Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart);
        
        this.checkBudget('pageLoadTime', this.metrics.pageLoadTime);
      }
    });

    // 비디오 로드 시간 모니터링
    this.monitorVideoLoadTime();
    
    // API 응답 시간 모니터링
    this.monitorApiResponseTime();
    
    // 컴포넌트 렌더 시간 모니터링
    this.monitorRenderTime();
  }

  // ========================================
  // 특수 메트릭 모니터링 메서드
  // ========================================
  private monitorVideoLoadTime(): void {
    document.addEventListener('loadstart', (event) => {
      const target = event.target as HTMLVideoElement;
      if (target.tagName === 'VIDEO') {
        const startTime = performance.now();
        
        const onCanPlay = () => {
          const loadTime = Math.round(performance.now() - startTime);
          this.metrics.videoLoadTime = loadTime;
          
          // 비디오 로딩이 5초 이상 걸리면 알림
          if (loadTime > 5000) {
            this.triggerAlert('videoLoadTime', loadTime, 5000, 'warning');
          }
          
          target.removeEventListener('canplay', onCanPlay);
        };
        
        target.addEventListener('canplay', onCanPlay);
      }
    });
  }

  private monitorApiResponseTime(): void {
    // Fetch API 인터셉트
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      const startTime = performance.now();
      
      return originalFetch(...args).then(response => {
        const responseTime = Math.round(performance.now() - startTime);
        this.updateApiResponseTime(responseTime);
        
        // API 응답이 2초 이상 걸리면 알림
        if (responseTime > 2000) {
          this.triggerAlert('apiResponseTime', responseTime, 2000, 'warning');
        }
        
        return response;
      });
    };
  }

  private monitorRenderTime(): void {
    // React/Next.js 컴포넌트 렌더 시간 측정
    if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__) {
      const observer = new MutationObserver(() => {
        const renderTime = performance.now();
        this.metrics.renderTime = Math.round(renderTime);
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  // ========================================
  // 유틸리티 메서드
  // ========================================
  private observeMetric(
    type: string, 
    callback: (entries: PerformanceEntry[]) => void
  ): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ type, buffered: true });
      this.observers.set(type, observer);
    } catch (error) {
      console.warn(`Performance observer for ${type} not supported:`, error);
    }
  }

  private getConnectionType(): string {
    const connection = (navigator as any).connection 
      || (navigator as any).mozConnection 
      || (navigator as any).webkitConnection;
    
    return connection?.effectiveType || 'unknown';
  }

  private updateApiResponseTime(responseTime: number): void {
    // 이동평균으로 API 응답시간 업데이트
    if (this.metrics.apiResponseTime) {
      this.metrics.apiResponseTime = Math.round(
        (this.metrics.apiResponseTime + responseTime) / 2
      );
    } else {
      this.metrics.apiResponseTime = responseTime;
    }
  }

  // ========================================
  // Budget 검사 및 알림
  // ========================================
  private checkBudget(metric: keyof PerformanceMetrics, value: number): void {
    const threshold = this.budget[metric as keyof PerformanceBudget];
    if (!threshold) return;
    
    let severity: 'warning' | 'critical' = 'warning';
    
    // 심각도 결정 로직
    if (metric === 'lcp' && value > threshold * 1.5) severity = 'critical';
    if (metric === 'fid' && value > threshold * 2) severity = 'critical';  
    if (metric === 'cls' && value > threshold * 2) severity = 'critical';
    if (metric === 'pageLoadTime' && value > threshold * 1.5) severity = 'critical';
    
    if (value > threshold) {
      this.triggerAlert(metric, value, threshold, severity);
    }
  }

  private triggerAlert(
    metric: keyof PerformanceMetrics,
    value: number,
    threshold: number,
    severity: 'warning' | 'critical'
  ): void {
    const alert: PerformanceAlert = {
      metric,
      value,
      threshold,
      severity,
      timestamp: Date.now(),
      url: this.metrics.url || window.location.href
    };
    
    // 콘솔 로그
    const emoji = severity === 'critical' ? '🚨' : '⚠️';
    console.warn(`${emoji} Performance ${severity}: ${metric} = ${value} (threshold: ${threshold})`);
    
    // 콜백 실행
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in performance alert callback:', error);
      }
    });
  }

  // ========================================
  // 공개 API
  // ========================================
  
  // 현재 메트릭 반환
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics } as PerformanceMetrics;
  }

  // 성능 점수 계산 (0-100)
  getPerformanceScore(): number {
    const weights = {
      lcp: 0.25,
      fid: 0.25,  
      cls: 0.25,
      fcp: 0.25
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([metric, weight]) => {
      const value = this.metrics[metric as keyof PerformanceMetrics] as number;
      const threshold = this.budget[metric as keyof PerformanceBudget];
      
      if (value !== null && value !== undefined) {
        // 점수 계산 (threshold 이하면 100점, 초과하면 감점)
        const score = Math.max(0, 100 - ((value - threshold) / threshold) * 100);
        totalScore += score * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  // 알림 콜백 등록
  onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  // 커스텀 메트릭 기록
  recordMetric(name: string, value: number): void {
    (this.metrics as any)[name] = value;
    
    // 커스텀 메트릭도 임계값 검사 (기본값 사용)
    const defaultThresholds: Record<string, number> = {
      videoLoadTime: 5000,
      apiResponseTime: 2000,
      renderTime: 1000
    };
    
    const threshold = defaultThresholds[name];
    if (threshold && value > threshold) {
      this.triggerAlert(name as any, value, threshold, 'warning');
    }
  }

  // 성능 마크 생성
  mark(name: string): void {
    if (performance.mark) {
      performance.mark(name);
    }
  }

  // 성능 측정
  measure(name: string, startMark: string, endMark?: string): number | null {
    try {
      if (performance.measure && performance.mark) {
        if (!endMark) {
          performance.mark(`${name}-end`);
          endMark = `${name}-end`;
        }
        
        performance.measure(name, startMark, endMark);
        
        const entries = performance.getEntriesByName(name, 'measure');
        return entries.length > 0 ? Math.round(entries[0].duration) : null;
      }
    } catch (error) {
      console.warn('Performance measurement failed:', error);
    }
    return null;
  }

  // 데이터 전송
  private setupBeaconReporting(): void {
    const sendMetrics = () => {
      if (navigator.sendBeacon && this.metrics.timestamp) {
        const payload = JSON.stringify({
          ...this.metrics,
          performanceScore: this.getPerformanceScore()
        });
        
        // 실제 메트릭 수집 엔드포인트로 전송
        navigator.sendBeacon('/api/performance-metrics', payload);
      }
    };

    // 페이지 언로드 시 전송
    window.addEventListener('beforeunload', sendMetrics);
    
    // 주기적 전송 (5분마다)
    setInterval(sendMetrics, 5 * 60 * 1000);
  }

  // 리소스 정리
  destroy(): void {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
    this.alertCallbacks.length = 0;
  }
}

// ========================================
// 전역 인스턴스 및 유틸리티
// ========================================
let globalMonitor: PerformanceMonitor | null = null;

export const initPerformanceMonitor = (budget?: Partial<PerformanceBudget>): PerformanceMonitor => {
  if (typeof window === 'undefined') {
    // SSR 환경에서는 더미 객체 반환
    return {
      getMetrics: () => ({} as any),
      getPerformanceScore: () => 0,
      onAlert: () => {},
      recordMetric: () => {},
      mark: () => {},
      measure: () => null,
      destroy: () => {}
    } as any;
  }
  
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor(budget);
  }
  
  return globalMonitor;
};

export const getPerformanceMonitor = (): PerformanceMonitor | null => {
  return globalMonitor;
};

// React Hook
export const usePerformanceMonitor = () => {
  if (typeof window === 'undefined') return null;
  
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  
  return globalMonitor;
};

// 기본 Budget
export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  lcp: 2500,    // Core Web Vitals 기준
  fid: 100,     // Core Web Vitals 기준  
  cls: 0.1,     // Core Web Vitals 기준
  fcp: 1800,    // Good 기준
  ttfb: 800,    // Good 기준
  pageLoadTime: 3000  // 사용자 경험 기준
};