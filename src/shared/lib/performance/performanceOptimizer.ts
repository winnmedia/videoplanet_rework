/**
 * Performance Optimization Utilities
 * Focus on LCP, INP, CLS optimization
 */

import { z } from 'zod';

// Performance observer configurations
export interface PerformanceObserverConfig {
  enableLongTasks: boolean;
  enableLayoutShift: boolean;
  enableLargestContentfulPaint: boolean;
  enableFirstInput: boolean;
  enableNavigation: boolean;
}

// Schema for performance entries validation
const PerformanceEntrySchema = z.object({
  name: z.string(),
  entryType: z.string(),
  startTime: z.number(),
  duration: z.number(),
});

// Layout shift attribution
export interface LayoutShiftAttribution {
  node?: Element;
  currentRect?: DOMRectReadOnly;
  previousRect?: DOMRectReadOnly;
}

// Long task attribution
export interface LongTaskAttribution {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  containerType: string;
  containerSrc: string;
  containerId: string;
  containerName: string;
}

class PerformanceOptimizer {
  private observers: PerformanceObserver[] = [];
  private config: PerformanceObserverConfig;

  constructor(config: Partial<PerformanceObserverConfig> = {}) {
    this.config = {
      enableLongTasks: true,
      enableLayoutShift: true,
      enableLargestContentfulPaint: true,
      enableFirstInput: true,
      enableNavigation: true,
      ...config,
    };
  }

  /**
   * Initialize all performance observers
   */
  public initialize(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      console.warn('[PerformanceOptimizer] PerformanceObserver not supported');
      return;
    }

    this.setupLongTasksObserver();
    this.setupLayoutShiftObserver();
    this.setupLCPObserver();
    this.setupFirstInputObserver();
    this.setupNavigationObserver();
    
    console.log('[PerformanceOptimizer] Performance monitoring initialized');
  }

  /**
   * Monitor long tasks that block main thread (affects INP)
   */
  private setupLongTasksObserver(): void {
    if (!this.config.enableLongTasks) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleLongTask(entry as PerformanceEntry & LongTaskAttribution);
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('[PerformanceOptimizer] Long task observer setup failed:', error);
    }
  }

  /**
   * Monitor layout shifts (affects CLS)
   */
  private setupLayoutShiftObserver(): void {
    if (!this.config.enableLayoutShift) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleLayoutShift(entry as any);
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('[PerformanceOptimizer] Layout shift observer setup failed:', error);
    }
  }

  /**
   * Monitor Largest Contentful Paint (affects LCP)
   */
  private setupLCPObserver(): void {
    if (!this.config.enableLargestContentfulPaint) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleLCP(entry as PerformanceEntry);
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('[PerformanceOptimizer] LCP observer setup failed:', error);
    }
  }

  /**
   * Monitor first input delay (affects INP)
   */
  private setupFirstInputObserver(): void {
    if (!this.config.enableFirstInput) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleFirstInput(entry as PerformanceEntry);
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('[PerformanceOptimizer] First input observer setup failed:', error);
    }
  }

  /**
   * Monitor navigation timing
   */
  private setupNavigationObserver(): void {
    if (!this.config.enableNavigation) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleNavigation(entry as PerformanceNavigationTiming);
        }
      });

      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('[PerformanceOptimizer] Navigation observer setup failed:', error);
    }
  }

  /**
   * Handle long task detection and optimization suggestions
   */
  private handleLongTask(entry: PerformanceEntry & LongTaskAttribution): void {
    const { startTime, duration, name } = entry;
    
    console.warn(`[PerformanceOptimizer] Long task detected: ${name} (${duration.toFixed(2)}ms)`);
    
    // Critical threshold for user experience
    if (duration > 200) {
      console.error(`[PerformanceOptimizer] Critical long task: ${duration.toFixed(2)}ms - affects INP`);
      
      // Suggest optimizations
      this.suggestLongTaskOptimizations(entry);
    }
  }

  /**
   * Handle layout shift detection and optimization suggestions
   */
  private handleLayoutShift(entry: any): void {
    if (entry.hadRecentInput) return; // Ignore user-initiated shifts
    
    const { value, startTime } = entry;
    
    if (value > 0.1) {
      console.warn(`[PerformanceOptimizer] Significant layout shift: ${value.toFixed(4)} at ${startTime.toFixed(2)}ms`);
      
      // Try to get attribution
      if (entry.sources && entry.sources.length > 0) {
        entry.sources.forEach((source: any, index: number) => {
          console.warn(`[PerformanceOptimizer] Layout shift source ${index}:`, {
            element: source.node?.tagName || 'unknown',
            currentRect: source.currentRect,
            previousRect: source.previousRect,
          });
        });
      }
      
      this.suggestLayoutShiftOptimizations();
    }
  }

  /**
   * Handle LCP monitoring and optimization suggestions
   */
  private handleLCP(entry: PerformanceEntry): void {
    const { startTime } = entry;
    const lcpElement = (entry as any).element;
    
    console.log(`[PerformanceOptimizer] LCP: ${startTime.toFixed(2)}ms`);
    
    if (startTime > 2500) {
      console.warn(`[PerformanceOptimizer] Poor LCP: ${startTime.toFixed(2)}ms`);
      
      if (lcpElement) {
        console.warn('[PerformanceOptimizer] LCP element:', {
          tagName: lcpElement.tagName,
          src: lcpElement.src || lcpElement.getAttribute('src'),
          className: lcpElement.className,
        });
      }
      
      this.suggestLCPOptimizations(lcpElement);
    }
  }

  /**
   * Handle first input delay monitoring
   */
  private handleFirstInput(entry: PerformanceEntry): void {
    const { startTime, processingStart } = entry as any;
    const inputDelay = processingStart - startTime;
    
    console.log(`[PerformanceOptimizer] First Input Delay: ${inputDelay.toFixed(2)}ms`);
    
    if (inputDelay > 100) {
      console.warn(`[PerformanceOptimizer] Poor First Input Delay: ${inputDelay.toFixed(2)}ms`);
      this.suggestFirstInputOptimizations();
    }
  }

  /**
   * Handle navigation timing analysis
   */
  private handleNavigation(entry: PerformanceNavigationTiming): void {
    const ttfb = entry.responseStart - entry.requestStart;
    const domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
    const loadComplete = entry.loadEventEnd - entry.loadEventStart;
    
    console.log(`[PerformanceOptimizer] Navigation timing:`, {
      ttfb: `${ttfb.toFixed(2)}ms`,
      domContentLoaded: `${domContentLoaded.toFixed(2)}ms`,
      loadComplete: `${loadComplete.toFixed(2)}ms`,
    });

    // Check for poor TTFB
    if (ttfb > 800) {
      console.warn(`[PerformanceOptimizer] Poor TTFB: ${ttfb.toFixed(2)}ms`);
      this.suggestTTFBOptimizations();
    }
  }

  /**
   * Optimization suggestions for long tasks
   */
  private suggestLongTaskOptimizations(entry: PerformanceEntry & LongTaskAttribution): void {
    const suggestions = [
      '코드 스플리팅으로 JavaScript 청크 크기 줄이기',
      'Web Workers로 메인 스레드 작업 분리',
      'React.startTransition으로 비긴급 업데이트 지연',
      'requestIdleCallback으로 유휴 시간 활용',
      '복잡한 계산을 여러 프레임으로 분할',
    ];
    
    console.warn('[PerformanceOptimizer] Long task optimization suggestions:', suggestions);
  }

  /**
   * Optimization suggestions for layout shifts
   */
  private suggestLayoutShiftOptimizations(): void {
    const suggestions = [
      '이미지와 비디오에 width/height 속성 추가',
      '폰트 로딩 시 font-display: swap 사용',
      '동적 콘텐츠를 위한 placeholder 크기 예약',
      'Transform과 opacity 속성만 사용하여 애니메이션',
      '광고나 embed 콘텐츠를 위한 공간 미리 예약',
    ];
    
    console.warn('[PerformanceOptimizer] Layout shift optimization suggestions:', suggestions);
  }

  /**
   * Optimization suggestions for LCP
   */
  private suggestLCPOptimizations(lcpElement?: Element): void {
    const suggestions = [
      '중요 리소스 preload 추가',
      '이미지 최적화 (WebP, AVIF 포맷)',
      '서버 응답 시간 개선',
      '렌더 블로킹 리소스 제거',
      '중요 CSS 인라인 처리',
    ];

    if (lcpElement?.tagName === 'IMG') {
      suggestions.push('LCP 이미지에 priority 속성 추가');
      suggestions.push('responsive images로 적절한 크기 제공');
    }
    
    console.warn('[PerformanceOptimizer] LCP optimization suggestions:', suggestions);
  }

  /**
   * Optimization suggestions for First Input Delay
   */
  private suggestFirstInputOptimizations(): void {
    const suggestions = [
      '긴 JavaScript 작업 분할',
      '코드 스플리팅으로 초기 번들 크기 줄이기',
      '타사 스크립트 최적화',
      'Service Worker로 리소스 사전 캐싱',
      '중요하지 않은 JavaScript 지연 로딩',
    ];
    
    console.warn('[PerformanceOptimizer] First Input Delay optimization suggestions:', suggestions);
  }

  /**
   * Optimization suggestions for TTFB
   */
  private suggestTTFBOptimizations(): void {
    const suggestions = [
      '서버 응답 시간 최적화',
      'CDN 사용으로 지연시간 단축',
      '데이터베이스 쿼리 최적화',
      '서버 사이드 캐싱 구현',
      'Keep-Alive 연결 사용',
    ];
    
    console.warn('[PerformanceOptimizer] TTFB optimization suggestions:', suggestions);
  }

  /**
   * Cleanup all observers
   */
  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Resource loading optimization utilities
export class ResourceOptimizer {
  /**
   * Preload critical resources
   */
  public static preloadCriticalResources(resources: Array<{
    href: string;
    as: string;
    type?: string;
    crossorigin?: boolean;
  }>): void {
    if (typeof document === 'undefined') return;

    resources.forEach(({ href, as, type, crossorigin }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      if (type) link.type = type;
      if (crossorigin) link.crossOrigin = 'anonymous';
      
      document.head.appendChild(link);
    });
  }

  /**
   * Prefetch non-critical resources
   */
  public static prefetchResources(urls: string[]): void {
    if (typeof document === 'undefined') return;

    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /**
   * Optimize image loading for LCP
   */
  public static optimizeImageLoading(): void {
    if (typeof document === 'undefined') return;

    // Find potential LCP images
    const images = document.querySelectorAll('img[data-priority="high"], img[priority]');
    
    images.forEach((img) => {
      if (img instanceof HTMLImageElement) {
        // Set high priority for LCP candidates
        img.loading = 'eager';
        img.decoding = 'sync';
        
        // Preload if above the fold
        const rect = img.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          this.preloadCriticalResources([{
            href: img.src,
            as: 'image',
            crossorigin: img.crossOrigin === 'anonymous',
          }]);
        }
      }
    });
  }

  /**
   * Prevent layout shifts by reserving space
   */
  public static preventLayoutShifts(): void {
    if (typeof document === 'undefined') return;

    // Find images without dimensions
    const undimensionedImages = document.querySelectorAll('img:not([width]):not([height])');
    
    undimensionedImages.forEach((img) => {
      console.warn('[PerformanceOptimizer] Image without dimensions detected - may cause CLS:', img);
    });

    // Monitor dynamic content insertion
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check for images added without dimensions
              const newImages = element.querySelectorAll('img:not([width]):not([height])');
              if (newImages.length > 0) {
                console.warn('[PerformanceOptimizer] Dynamic images without dimensions may cause CLS');
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Optimize font loading to prevent FOUT/FOIT
   */
  public static optimizeFontLoading(): void {
    if (typeof document === 'undefined') return;

    // Check for font-display property
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    
    stylesheets.forEach((stylesheet) => {
      if (stylesheet instanceof HTMLLinkElement) {
        // Add preload hint for critical fonts
        if (stylesheet.href.includes('font')) {
          const preloadLink = document.createElement('link');
          preloadLink.rel = 'preload';
          preloadLink.href = stylesheet.href;
          preloadLink.as = 'style';
          document.head.appendChild(preloadLink);
        }
      }
    });

    // Monitor font loading
    if ('fonts' in document) {
      (document as any).fonts.ready.then(() => {
        console.log('[PerformanceOptimizer] All fonts loaded');
      });

      (document as any).fonts.addEventListener('loadingdone', (event: any) => {
        console.log(`[PerformanceOptimizer] Font loaded: ${event.fontface.family}`);
      });
    }
  }

  /**
   * Get performance recommendations
   */
  public getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Check current metrics
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.requestStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        
        if (ttfb > 800) {
          recommendations.push('서버 응답 시간 최적화 필요 (TTFB > 800ms)');
        }
        
        if (domContentLoaded > 1000) {
          recommendations.push('DOM 처리 최적화 필요 (DOM Content Loaded > 1000ms)');
        }
      }
      
      // Check resource timing
      const resources = performance.getEntriesByType('resource');
      const largeResources = resources.filter(resource => 
        resource.transferSize && resource.transferSize > 500000 // 500KB
      );
      
      if (largeResources.length > 0) {
        recommendations.push(`큰 리소스 최적화 필요: ${largeResources.length}개 파일 > 500KB`);
      }
    }
    
    return recommendations;
  }

  /**
   * Cleanup all observers
   */
  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
let performanceOptimizer: PerformanceOptimizer | null = null;

export function initPerformanceOptimizer(config?: Partial<PerformanceObserverConfig>): PerformanceOptimizer {
  if (!performanceOptimizer) {
    performanceOptimizer = new PerformanceOptimizer(config);
  }
  return performanceOptimizer;
}

export function getPerformanceOptimizer(): PerformanceOptimizer | null {
  return performanceOptimizer;
}

export { PerformanceOptimizer };