/**
 * @fileoverview 복잡도 감소 검증을 위한 베이스라인 행동 캡처 테스트
 * @author Grace (QA Lead)
 * @description TDD Red-Green-Refactor 사이클의 Red 단계: 리팩토링 전 현재 행동 캡처
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import critical components to establish baseline behavior
import { NavigationProvider } from '@/features/navigation/ui/NavigationProvider';
import CalendarWidget from '@/widgets/Calendar/ui/CalendarWidget';
import DashboardWidget from '@/widgets/Dashboard/ui/DashboardWidget';
import VideoFeedbackWidget from '@/widgets/VideoFeedback/ui/VideoFeedbackWidget';

// MSW server setup for deterministic API mocking
const server = setupServer(
  http.get('/api/dashboard/stats', () => {
    return HttpResponse.json({
      projectsCount: 5,
      activeUsersCount: 12,
      pendingFeedback: 3,
      completedTasks: 47
    });
  }),
  http.get('/api/calendar/events', () => {
    return HttpResponse.json([
      {
        id: 1,
        title: '프로젝트 A 촬영',
        startTime: '2025-01-15T09:00:00Z',
        endTime: '2025-01-15T17:00:00Z',
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

describe('복잡도 감소 베이스라인 행동 캡처 (Baseline Behavior Capture)', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
    // 시드 데이터로 결정론적 테스트 보장
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    server.resetHandlers();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  /**
   * RED PHASE: 현재 Dashboard Widget의 정확한 행동 캡처
   */
  describe('Dashboard Widget - 현재 행동 베이스라인', () => {
    it('should render dashboard stats with exact current structure', async () => {
      render(
        <NavigationProvider>
          <DashboardWidget />
        </NavigationProvider>
      );

      // 현재 정확한 DOM 구조 캡처
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // Projects count
        expect(screen.getByText('12')).toBeInTheDocument(); // Active users
        expect(screen.getByText('3')).toBeInTheDocument(); // Pending feedback
        expect(screen.getByText('47')).toBeInTheDocument(); // Completed tasks
      });

      // 현재 CSS 클래스 구조 보존 검증
      const dashboardElement = screen.getByTestId('dashboard-widget');
      expect(dashboardElement).toHaveClass('dashboard-widget');
      
      // 현재 접근성 속성 보존 검증
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText('대시보드 통계')).toBeInTheDocument();
    });

    it('should maintain current click interaction behavior', async () => {
      const mockOnStatClick = vi.fn();
      render(
        <NavigationProvider>
          <DashboardWidget onStatClick={mockOnStatClick} />
        </NavigationProvider>
      );

      await waitFor(() => {
        const projectsStat = screen.getByTestId('projects-stat');
        fireEvent.click(projectsStat);
        expect(mockOnStatClick).toHaveBeenCalledWith('projects');
      });
    });

    it('should preserve current loading state behavior', async () => {
      server.use(
        http.get('/api/dashboard/stats', () => {
          return new Promise(resolve => setTimeout(resolve, 1000));
        })
      );

      render(
        <NavigationProvider>
          <DashboardWidget />
        </NavigationProvider>
      );

      // 현재 로딩 상태 UI 검증
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
      expect(screen.getByText('데이터 로딩 중...')).toBeInTheDocument();
    });
  });

  /**
   * Calendar Widget 베이스라인 행동 캡처
   */
  describe('Calendar Widget - 현재 행동 베이스라인', () => {
    it('should render calendar events with current structure', async () => {
      render(
        <NavigationProvider>
          <CalendarWidget />
        </NavigationProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('프로젝트 A 촬영')).toBeInTheDocument();
        expect(screen.getByText('2025-01-15')).toBeInTheDocument();
      });

      // 현재 캘린더 네비게이션 구조 검증
      const prevButton = screen.getByLabelText('이전 달');
      const nextButton = screen.getByLabelText('다음 달');
      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });

    it('should preserve current event interaction behavior', async () => {
      render(
        <NavigationProvider>
          <CalendarWidget />
        </NavigationProvider>
      );

      await waitFor(() => {
        const eventElement = screen.getByTestId('calendar-event-1');
        fireEvent.click(eventElement);
        
        // 현재 이벤트 클릭 시 모달 표시 행동 검증
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('이벤트 상세 정보')).toBeInTheDocument();
      });
    });
  });

  /**
   * Video Feedback Widget 베이스라인 행동 캡처
   */
  describe('Video Feedback Widget - 현재 행동 베이스라인', () => {
    it('should render video feedback interface with current structure', async () => {
      render(
        <NavigationProvider>
          <VideoFeedbackWidget videoId="video-123" />
        </NavigationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
        expect(screen.getByTestId('feedback-panel')).toBeInTheDocument();
      });

      // 현재 비디오 플레이어 컨트롤 구조 검증
      const playButton = screen.getByLabelText('재생');
      const volumeControl = screen.getByLabelText('볼륨 조절');
      expect(playButton).toBeInTheDocument();
      expect(volumeControl).toBeInTheDocument();
    });

    it('should preserve current comment submission behavior', async () => {
      render(
        <NavigationProvider>
          <VideoFeedbackWidget videoId="video-123" />
        </NavigationProvider>
      );

      const commentInput = await screen.findByPlaceholderText('피드백을 입력하세요');
      const submitButton = screen.getByText('댓글 작성');

      fireEvent.change(commentInput, { target: { value: '테스트 댓글' } });
      fireEvent.click(submitButton);

      // 현재 댓글 제출 후 UI 업데이트 행동 검증
      await waitFor(() => {
        expect(screen.getByText('댓글이 성공적으로 작성되었습니다')).toBeInTheDocument();
      });
    });
  });

  /**
   * Cross-Widget Navigation 베이스라인 행동 캡처
   */
  describe('Cross-Widget Navigation - 현재 상호작용 베이스라인', () => {
    it('should preserve current navigation state consistency', async () => {
      render(
        <NavigationProvider>
          <div>
            <DashboardWidget />
            <CalendarWidget />
          </div>
        </NavigationProvider>
      );

      // 대시보드에서 프로젝트 통계 클릭
      await waitFor(() => {
        const projectsStat = screen.getByTestId('projects-stat');
        fireEvent.click(projectsStat);
      });

      // 현재 네비게이션 상태가 캘린더에 반영되는 행동 검증
      await waitFor(() => {
        const calendarWidget = screen.getByTestId('calendar-widget');
        expect(calendarWidget).toHaveClass('filtered-by-projects');
      });
    });
  });

  /**
   * Performance Baseline Metrics 캡처
   */
  describe('Performance Baseline Metrics', () => {
    it('should capture current rendering performance baseline', async () => {
      const startTime = performance.now();
      
      render(
        <NavigationProvider>
          <DashboardWidget />
          <CalendarWidget />
          <VideoFeedbackWidget videoId="video-123" />
        </NavigationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-widget')).toBeInTheDocument();
        expect(screen.getByTestId('calendar-widget')).toBeInTheDocument();
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      
      // 현재 렌더링 성능 베이스라인 (5% 허용 오차)
      expect(renderTime).toBeLessThan(2000); // 2초 이내 렌더링
      
      console.log(`Baseline Render Time: ${renderTime}ms`);
    });

    it('should capture current memory usage baseline', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      render(
        <NavigationProvider>
          <DashboardWidget />
          <CalendarWidget />
          <VideoFeedbackWidget videoId="video-123" />
        </NavigationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-widget')).toBeInTheDocument();
      });

      const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryDelta = currentMemory - initialMemory;
      
      console.log(`Baseline Memory Usage: ${memoryDelta} bytes`);
      
      // 메모리 사용량 베이스라인 기록 (리팩토링 후 개선 검증용)
      expect(memoryDelta).toBeGreaterThan(0); // 컴포넌트 로드로 인한 메모리 증가 확인
    });
  });
});

/**
 * 베이스라인 행동 스냅샷 유틸리티
 * 리팩토링 전후 정확한 비교를 위한 스냅샷 캡처
 */
export const captureBaselineBehavior = {
  /**
   * DOM 구조 스냅샷 캡처
   */
  domSnapshot: (element: HTMLElement) => ({
    tagName: element.tagName,
    classList: Array.from(element.classList),
    attributes: Array.from(element.attributes).reduce((acc, attr) => {
      acc[attr.name] = attr.value;
      return acc;
    }, {} as Record<string, string>),
    textContent: element.textContent,
    childCount: element.children.length
  }),

  /**
   * 이벤트 리스너 스냅샷 캡처
   */
  eventListeners: (element: HTMLElement) => {
    // getEventListeners는 브라우저 개발자 도구에서만 사용 가능
    // 테스트 환경에서는 mock 이벤트 핸들러 추적으로 대체
    return {
      click: !!element.onclick,
      focus: !!element.onfocus,
      blur: !!element.onblur,
      keydown: !!element.onkeydown
    };
  },

  /**
   * 스타일 속성 스냅샷 캡처
   */
  computedStyles: (element: HTMLElement) => {
    const styles = window.getComputedStyle(element);
    return {
      display: styles.display,
      position: styles.position,
      width: styles.width,
      height: styles.height,
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      fontSize: styles.fontSize,
      fontFamily: styles.fontFamily
    };
  }
};