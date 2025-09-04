/**
 * @fileoverview Performance Baseline Validation Tests
 * @author Grace (QA Lead)
 * @description 복잡도 감소 리팩토링의 성능 개선 효과 검증을 위한 베이스라인 성능 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { performance, PerformanceObserver } from 'perf_hooks';

// Performance monitoring utilities
import { PerformanceMonitor } from '@/shared/lib/performance-monitor';

// Test components for performance baseline measurement
import DashboardWidget from '@/widgets/Dashboard/ui/DashboardWidget';
import CalendarWidget from '@/widgets/Calendar/ui/CalendarWidget';
import VideoFeedbackWidget from '@/widgets/VideoFeedback/ui/VideoFeedbackWidget';
import { NavigationProvider } from '@/features/navigation/ui/NavigationProvider';

// MSW setup for consistent API responses
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const performanceServer = setupServer(
  http.get('/api/dashboard/stats', () => {
    return HttpResponse.json({
      projectsCount: 8,
      activeUsersCount: 23,
      pendingFeedback: 5,
      completedTasks: 124,
      timestamp: new Date().toISOString()
    });
  }),
  http.get('/api/calendar/events', () => {
    return HttpResponse.json([
      {
        id: 1,
        title: '프로젝트 Alpha 촬영',
        startTime: '2025-01-20T09:00:00Z',
        endTime: '2025-01-20T17:00:00Z',
        status: 'confirmed'
      }
    ]);
  }),
  http.get('/api/video-feedback/pending', () => {
    return HttpResponse.json([
      {
        id: 1,
        videoId: 'video-123',
        comments: [],
        status: 'pending'
      }
    ]);
  })
);

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  domNodeCount: number;
  rerenderCount: number;
  paintTime: number;
  layoutTime: number;
}

/**
 * Performance measurement utilities
 */
class PerformanceBaseline {
  private metrics: Record<string, PerformanceMetrics> = {};
  private observer: PerformanceObserver | null = null;

  startMeasurement(name: string): void {
    // Clear previous measurements
    if (typeof window !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
    
    // Start performance mark
    performance.mark(`${name}-start`);
    
    // Initialize metrics
    this.metrics[name] = {
      renderTime: 0,
      memoryUsage: this.getMemoryUsage(),
      domNodeCount: 0,
      rerenderCount: 0,
      paintTime: 0,
      layoutTime: 0
    };
  }

  endMeasurement(name: string): PerformanceMetrics {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const entries = performance.getEntriesByName(name, 'measure');
    const lastEntry = entries[entries.length - 1];
    
    const finalMetrics = {
      ...this.metrics[name],
      renderTime: lastEntry?.duration || 0,
      memoryUsage: this.getMemoryUsage() - this.metrics[name].memoryUsage,
      domNodeCount: this.getDomNodeCount()
    };
    
    this.metrics[name] = finalMetrics;
    return finalMetrics;
  }

  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private getDomNodeCount(): number {
    if (typeof document !== 'undefined') {
      return document.getElementsByTagName('*').length;
    }
    return 0;
  }

  getMetrics(name: string): PerformanceMetrics | undefined {
    return this.metrics[name];
  }

  compareMetrics(baseline: PerformanceMetrics, current: PerformanceMetrics): {
    renderTimeImprovement: number;
    memoryImprovement: number;
    domReduction: number;
  } {
    return {
      renderTimeImprovement: ((baseline.renderTime - current.renderTime) / baseline.renderTime) * 100,
      memoryImprovement: ((baseline.memoryUsage - current.memoryUsage) / baseline.memoryUsage) * 100,
      domReduction: ((baseline.domNodeCount - current.domNodeCount) / baseline.domNodeCount) * 100
    };
  }
}

describe('복잡도 감소 성능 베이스라인 검증 (Performance Baseline Validation)', () => {
  let performanceBaseline: PerformanceBaseline;

  beforeEach(() => {
    performanceServer.listen({ onUnhandledRequest: 'error' });
    performanceBaseline = new PerformanceBaseline();
    
    // 결정론적 시간 설정
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    
    // 성능 측정을 위한 환경 설정
    Object.defineProperty(window, 'performance', {
      value: performance,
      writable: true
    });
  });

  afterEach(() => {
    performanceServer.resetHandlers();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  /**
   * Dashboard Widget Performance Baseline
   */
  describe('Dashboard Widget 성능 베이스라인', () => {
    it('should establish dashboard render time baseline', async () => {
      performanceBaseline.startMeasurement('dashboard-render');
      
      const startTime = performance.now();
      
      render(
        <NavigationProvider>
          <DashboardWidget />
        </NavigationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-widget')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const metrics = performanceBaseline.endMeasurement('dashboard-render');
      
      // 베이스라인 성능 기준 설정
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(2000); // 2초 이내 렌더링
      
      // 메모리 사용량 베이스라인
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB 이내
      
      // DOM 노드 수 베이스라인
      expect(metrics.domNodeCount).toBeGreaterThan(0);
      expect(metrics.domNodeCount).toBeLessThan(500); // 500개 이내 DOM 노드
      
      console.log('Dashboard Performance Baseline:', {
        renderTime: `${renderTime.toFixed(2)}ms`,
        memoryUsage: `${(metrics.memoryUsage / 1024).toFixed(2)}KB`,
        domNodeCount: metrics.domNodeCount
      });
    });

    it('should measure dashboard interaction performance baseline', async () => {
      render(
        <NavigationProvider>
          <DashboardWidget />
        </NavigationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('projects-stat')).toBeInTheDocument();
      });

      performanceBaseline.startMeasurement('dashboard-interaction');
      
      const startTime = performance.now();
      
      // 통계 카드 클릭 상호작용
      fireEvent.click(screen.getByTestId('projects-stat'));
      
      await waitFor(() => {
        // 클릭 후 상태 변화 대기
        expect(screen.getByTestId('projects-stat')).toHaveClass('active');
      });

      const endTime = performance.now();
      const metrics = performanceBaseline.endMeasurement('dashboard-interaction');
      
      const interactionTime = endTime - startTime;
      expect(interactionTime).toBeLessThan(100); // 100ms 이내 응답
      
      console.log('Dashboard Interaction Baseline:', {
        interactionTime: `${interactionTime.toFixed(2)}ms`
      });
    });

    it('should establish dashboard re-render performance baseline', async () => {
      const mockProps = { refreshInterval: 1000 };
      
      const { rerender } = render(
        <NavigationProvider>
          <DashboardWidget {...mockProps} />
        </NavigationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-widget')).toBeInTheDocument();
      });

      performanceBaseline.startMeasurement('dashboard-rerender');
      
      const startTime = performance.now();
      
      // Props 변경으로 리렌더 트리거
      rerender(
        <NavigationProvider>
          <DashboardWidget {...mockProps} refreshInterval={2000} />
        </NavigationProvider>
      );

      const endTime = performance.now();
      const metrics = performanceBaseline.endMeasurement('dashboard-rerender');
      
      const rerenderTime = endTime - startTime;
      expect(rerenderTime).toBeLessThan(50); // 50ms 이내 리렌더
      
      console.log('Dashboard Re-render Baseline:', {
        rerenderTime: `${rerenderTime.toFixed(2)}ms`,
        memoryDelta: `${(metrics.memoryUsage / 1024).toFixed(2)}KB`
      });
    });
  });

  /**
   * Calendar Widget Performance Baseline
   */
  describe('Calendar Widget 성능 베이스라인', () => {
    it('should establish calendar render time baseline', async () => {
      performanceBaseline.startMeasurement('calendar-render');
      
      const startTime = performance.now();
      
      render(
        <NavigationProvider>
          <CalendarWidget />
        </NavigationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('calendar-widget')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const metrics = performanceBaseline.endMeasurement('calendar-render');
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(1500); // 1.5초 이내 렌더링
      
      // 캘린더는 더 복잡한 DOM 구조를 가질 수 있음
      expect(metrics.domNodeCount).toBeLessThan(1000);
      
      console.log('Calendar Performance Baseline:', {
        renderTime: `${renderTime.toFixed(2)}ms`,
        memoryUsage: `${(metrics.memoryUsage / 1024).toFixed(2)}KB`,
        domNodeCount: metrics.domNodeCount
      });
    });

    it('should measure calendar navigation performance baseline', async () => {
      render(
        <NavigationProvider>
          <CalendarWidget />
        </NavigationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('calendar-prev-month')).toBeInTheDocument();
      });

      performanceBaseline.startMeasurement('calendar-navigation');
      
      const startTime = performance.now();
      
      // 달 네비게이션 클릭
      fireEvent.click(screen.getByTestId('calendar-prev-month'));
      
      await waitFor(() => {
        // 달 변경 완료 확인
        expect(screen.getByTestId('calendar-widget')).toHaveAttribute('data-month-changed');
      }, { timeout: 1000 });

      const endTime = performance.now();
      const metrics = performanceBaseline.endMeasurement('calendar-navigation');
      
      const navigationTime = endTime - startTime;
      expect(navigationTime).toBeLessThan(300); // 300ms 이내 달 네비게이션
      
      console.log('Calendar Navigation Baseline:', {
        navigationTime: `${navigationTime.toFixed(2)}ms`
      });
    });
  });

  /**
   * Video Feedback Widget Performance Baseline
   */
  describe('Video Feedback Widget 성능 베이스라인', () => {
    it('should establish video feedback render time baseline', async () => {
      performanceBaseline.startMeasurement('video-feedback-render');
      
      const startTime = performance.now();
      
      render(
        <NavigationProvider>
          <VideoFeedbackWidget videoId="video-123" />
        </NavigationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const metrics = performanceBaseline.endMeasurement('video-feedback-render');
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(2500); // 2.5초 이내 (비디오 위젯은 더 복잡)
      
      console.log('Video Feedback Performance Baseline:', {
        renderTime: `${renderTime.toFixed(2)}ms`,
        memoryUsage: `${(metrics.memoryUsage / 1024).toFixed(2)}KB`,
        domNodeCount: metrics.domNodeCount
      });
    });

    it('should measure comment submission performance baseline', async () => {
      render(
        <NavigationProvider>
          <VideoFeedbackWidget videoId="video-123" />
        </NavigationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('comment-input')).toBeInTheDocument();
      });

      performanceBaseline.startMeasurement('comment-submission');
      
      const startTime = performance.now();
      
      // 댓글 입력 및 제출
      const commentInput = screen.getByTestId('comment-input');
      fireEvent.change(commentInput, { target: { value: '새로운 댓글입니다' } });
      fireEvent.click(screen.getByTestId('comment-submit'));
      
      await waitFor(() => {
        expect(screen.getByText('댓글이 성공적으로 작성되었습니다')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const metrics = performanceBaseline.endMeasurement('comment-submission');
      
      const submissionTime = endTime - startTime;
      expect(submissionTime).toBeLessThan(500); // 500ms 이내 댓글 제출
      
      console.log('Comment Submission Baseline:', {
        submissionTime: `${submissionTime.toFixed(2)}ms`
      });
    });
  });

  /**
   * Multi-Widget Performance Baseline (복합 위젯 성능)
   */
  describe('Multi-Widget 복합 성능 베이스라인', () => {
    it('should establish multi-widget render time baseline', async () => {
      performanceBaseline.startMeasurement('multi-widget-render');
      
      const startTime = performance.now();
      
      render(
        <NavigationProvider>
          <div>
            <DashboardWidget />
            <CalendarWidget />
            <VideoFeedbackWidget videoId="video-123" />
          </div>
        </NavigationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-widget')).toBeInTheDocument();
        expect(screen.getByTestId('calendar-widget')).toBeInTheDocument();
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const metrics = performanceBaseline.endMeasurement('multi-widget-render');
      
      const totalRenderTime = endTime - startTime;
      expect(totalRenderTime).toBeLessThan(5000); // 5초 이내 전체 렌더링
      
      // 복합 위젯 메모리 사용량 베이스라인
      expect(metrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB 이내
      
      // 전체 DOM 노드 수 베이스라인
      expect(metrics.domNodeCount).toBeLessThan(2000);
      
      console.log('Multi-Widget Performance Baseline:', {
        totalRenderTime: `${totalRenderTime.toFixed(2)}ms`,
        memoryUsage: `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        domNodeCount: metrics.domNodeCount
      });
    });

    it('should measure cross-widget interaction performance baseline', async () => {
      render(
        <NavigationProvider>
          <div>
            <DashboardWidget />
            <CalendarWidget />
          </div>
        </NavigationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-widget')).toBeInTheDocument();
        expect(screen.getByTestId('calendar-widget')).toBeInTheDocument();
      });

      performanceBaseline.startMeasurement('cross-widget-interaction');
      
      const startTime = performance.now();
      
      // Dashboard에서 프로젝트 통계 클릭 (Calendar에 영향)
      fireEvent.click(screen.getByTestId('projects-stat'));
      
      await waitFor(() => {
        // Calendar 위젯이 필터링 상태로 변경되는지 확인
        expect(screen.getByTestId('calendar-widget')).toHaveClass('filtered-by-projects');
      });

      const endTime = performance.now();
      const metrics = performanceBaseline.endMeasurement('cross-widget-interaction');
      
      const interactionTime = endTime - startTime;
      expect(interactionTime).toBeLessThan(200); // 200ms 이내 cross-widget 상호작용
      
      console.log('Cross-Widget Interaction Baseline:', {
        interactionTime: `${interactionTime.toFixed(2)}ms`
      });
    });
  });

  /**
   * Memory Leak Detection Baseline
   */
  describe('메모리 누수 감지 베이스라인', () => {
    it('should establish memory leak detection baseline', async () => {
      const iterations = 10;
      const memorySnapshots: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { unmount } = render(
          <NavigationProvider>
            <DashboardWidget />
          </NavigationProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId('dashboard-widget')).toBeInTheDocument();
        });

        // 메모리 스냅샷 취득
        const currentMemory = performanceBaseline['getMemoryUsage']();
        memorySnapshots.push(currentMemory);

        // 컴포넌트 언마운트
        unmount();
      }

      // 메모리 증가 패턴 분석
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
      const averageGrowthPerIteration = memoryGrowth / iterations;

      // 메모리 누수 임계값 설정 (iteration당 1MB 이하)
      expect(averageGrowthPerIteration).toBeLessThan(1024 * 1024);

      console.log('Memory Leak Detection Baseline:', {
        totalMemoryGrowth: `${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`,
        averageGrowthPerIteration: `${(averageGrowthPerIteration / 1024).toFixed(2)}KB`,
        iterations
      });
    });
  });
});

/**
 * Performance Validation Utilities
 * 리팩토링 후 성능 개선 검증에 사용할 유틸리티
 */
export const PerformanceValidationUtils = {
  /**
   * 성능 메트릭 비교
   */
  comparePerformanceMetrics: (
    baseline: PerformanceMetrics,
    current: PerformanceMetrics,
    thresholds: { renderTime: number; memory: number; domNodes: number }
  ) => {
    const improvements = {
      renderTime: ((baseline.renderTime - current.renderTime) / baseline.renderTime) * 100,
      memory: ((baseline.memoryUsage - current.memoryUsage) / baseline.memoryUsage) * 100,
      domNodes: ((baseline.domNodeCount - current.domNodeCount) / baseline.domNodeCount) * 100
    };

    return {
      improvements,
      passesThresholds: {
        renderTime: improvements.renderTime >= thresholds.renderTime,
        memory: improvements.memory >= thresholds.memory,
        domNodes: improvements.domNodes >= thresholds.domNodes
      }
    };
  },

  /**
   * 성능 회귀 감지
   */
  detectPerformanceRegression: (
    baseline: PerformanceMetrics,
    current: PerformanceMetrics,
    regressionThreshold: number = 5 // 5% 회귀 허용
  ) => {
    const renderTimeRegression = ((current.renderTime - baseline.renderTime) / baseline.renderTime) * 100;
    const memoryRegression = ((current.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage) * 100;

    return {
      hasRegression: renderTimeRegression > regressionThreshold || memoryRegression > regressionThreshold,
      details: {
        renderTimeRegression: `${renderTimeRegression.toFixed(2)}%`,
        memoryRegression: `${memoryRegression.toFixed(2)}%`,
        threshold: `${regressionThreshold}%`
      }
    };
  },

  /**
   * 성능 개선 보고서 생성
   */
  generatePerformanceReport: (
    testName: string,
    baseline: PerformanceMetrics,
    current: PerformanceMetrics
  ) => {
    const comparison = PerformanceValidationUtils.comparePerformanceMetrics(
      baseline,
      current,
      { renderTime: 10, memory: 5, domNodes: 10 }
    );

    return {
      testName,
      timestamp: new Date().toISOString(),
      baseline: {
        renderTime: `${baseline.renderTime.toFixed(2)}ms`,
        memory: `${(baseline.memoryUsage / 1024).toFixed(2)}KB`,
        domNodes: baseline.domNodeCount
      },
      current: {
        renderTime: `${current.renderTime.toFixed(2)}ms`,
        memory: `${(current.memoryUsage / 1024).toFixed(2)}KB`,
        domNodes: current.domNodeCount
      },
      improvements: {
        renderTime: `${comparison.improvements.renderTime.toFixed(2)}%`,
        memory: `${comparison.improvements.memory.toFixed(2)}%`,
        domNodes: `${comparison.improvements.domNodes.toFixed(2)}%`
      },
      verdict: Object.values(comparison.passesThresholds).every(Boolean) ? 'PASS' : 'FAIL'
    };
  }
};