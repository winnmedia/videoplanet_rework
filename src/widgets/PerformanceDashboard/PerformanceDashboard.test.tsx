/**
 * Tests for PerformanceDashboard widget
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PerformanceDashboard from './PerformanceDashboard';

// Mock performance hook
const mockUsePerformance = {
  metrics: {
    lcp: { name: 'LCP', value: 2000, rating: 'good' as const, delta: 2000, id: 'lcp-1', timestamp: Date.now(), url: 'http://localhost:3000', userAgent: 'test', deviceType: 'desktop' as const },
    inp: { name: 'INP', value: 150, rating: 'good' as const, delta: 150, id: 'inp-1', timestamp: Date.now(), url: 'http://localhost:3000', userAgent: 'test', deviceType: 'desktop' as const },
    cls: { name: 'CLS', value: 0.05, rating: 'good' as const, delta: 0.05, id: 'cls-1', timestamp: Date.now(), url: 'http://localhost:3000', userAgent: 'test', deviceType: 'desktop' as const },
    fcp: { name: 'FCP', value: 1200, rating: 'good' as const, delta: 1200, id: 'fcp-1', timestamp: Date.now(), url: 'http://localhost:3000', userAgent: 'test', deviceType: 'desktop' as const },
  },
  allMetrics: [],
  isMonitoring: true,
  hasPerformanceIssues: false,
  performanceScore: 95,
  flushMetrics: jest.fn(),
  clearMetrics: jest.fn(),
  getRecommendations: jest.fn(() => []),
  trackCustomMetric: jest.fn(),
  preloadResource: jest.fn(),
  prefetchResource: jest.fn(),
};

jest.mock('../../shared/lib/performance/usePerformance', () => ({
  usePerformance: () => mockUsePerformance,
}));

describe('PerformanceDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders dashboard with metrics', () => {
      render(<PerformanceDashboard />);
      
      expect(screen.getByText('성능 대시보드')).toBeInTheDocument();
      expect(screen.getByText('실시간 Core Web Vitals 모니터링')).toBeInTheDocument();
      
      // Check metric cards
      expect(screen.getByText('LCP')).toBeInTheDocument();
      expect(screen.getByText('INP')).toBeInTheDocument();
      expect(screen.getByText('CLS')).toBeInTheDocument();
      expect(screen.getByText('FCP')).toBeInTheDocument();
    });

    it('shows performance score', () => {
      render(<PerformanceDashboard />);
      
      expect(screen.getByText('95')).toBeInTheDocument();
      expect(screen.getByText('전체 성능 점수')).toBeInTheDocument();
      expect(screen.getByText('우수')).toBeInTheDocument();
    });

    it('shows monitoring status', () => {
      render(<PerformanceDashboard />);
      
      expect(screen.getByText('모니터링 활성')).toBeInTheDocument();
      expect(screen.getByText('성능 양호')).toBeInTheDocument();
    });
  });

  describe('Metric Display', () => {
    it('displays LCP metric correctly', () => {
      render(<PerformanceDashboard />);
      
      expect(screen.getByText('2000ms')).toBeInTheDocument();
      expect(screen.getByText('목표: 2500ms')).toBeInTheDocument();
      expect(screen.getByText('최대 콘텐츠 페인트')).toBeInTheDocument();
    });

    it('displays CLS metric with correct format', () => {
      render(<PerformanceDashboard />);
      
      expect(screen.getByText('0.050')).toBeInTheDocument();
      expect(screen.getByText('목표: 0.1')).toBeInTheDocument();
      expect(screen.getByText('누적 레이아웃 이동')).toBeInTheDocument();
    });

    it('shows loading state when metrics are not available', () => {
      const emptyMockUsePerformance = {
        ...mockUsePerformance,
        metrics: {},
      };

      jest.mocked(require('../../shared/lib/performance/usePerformance').usePerformance)
        .mockReturnValue(emptyMockUsePerformance);

      render(<PerformanceDashboard />);
      
      expect(screen.getAllByText('측정 중...')).toHaveLength(6);
    });
  });

  describe('Performance Issues', () => {
    it('shows performance alert when issues detected', () => {
      const issuesMockUsePerformance = {
        ...mockUsePerformance,
        hasPerformanceIssues: true,
        metrics: {
          ...mockUsePerformance.metrics,
          lcp: { ...mockUsePerformance.metrics.lcp!, value: 4000, rating: 'poor' as const },
        },
      };

      jest.mocked(require('../../shared/lib/performance/usePerformance').usePerformance)
        .mockReturnValue(issuesMockUsePerformance);

      render(<PerformanceDashboard />);
      
      expect(screen.getByText('성능 이슈 감지됨')).toBeInTheDocument();
      expect(screen.getByText(/하나 이상의 Core Web Vitals 지표가/)).toBeInTheDocument();
    });

    it('calls onPerformanceIssue callback when issues detected', () => {
      const onPerformanceIssue = jest.fn();
      const issuesMockUsePerformance = {
        ...mockUsePerformance,
        hasPerformanceIssues: true,
        allMetrics: [
          { name: 'LCP', value: 4000, rating: 'poor' as const, delta: 4000, id: 'lcp-poor', timestamp: Date.now(), url: 'http://localhost:3000', userAgent: 'test', deviceType: 'desktop' as const },
        ],
      };

      jest.mocked(require('../../shared/lib/performance/usePerformance').usePerformance)
        .mockReturnValue(issuesMockUsePerformance);

      render(<PerformanceDashboard onPerformanceIssue={onPerformanceIssue} />);
      
      expect(onPerformanceIssue).toHaveBeenCalledWith({
        type: 'poor_performance',
        message: 'Poor LCP performance: 4000ms',
        data: expect.objectContaining({
          name: 'LCP',
          value: 4000,
          rating: 'poor',
        }),
      });
    });
  });

  describe('Recommendations', () => {
    it('shows recommendations when available', () => {
      const recommendationsMockUsePerformance = {
        ...mockUsePerformance,
        getRecommendations: jest.fn(() => [
          'LCP 개선: 중요 리소스 preload, 이미지 최적화',
          'INP 개선: 긴 작업 분할, 코드 스플리팅',
        ]),
      };

      jest.mocked(require('../../shared/lib/performance/usePerformance').usePerformance)
        .mockReturnValue(recommendationsMockUsePerformance);

      render(<PerformanceDashboard />);
      
      expect(screen.getByText('성능 개선 권장사항')).toBeInTheDocument();
      expect(screen.getByText(/LCP 개선/)).toBeInTheDocument();
      expect(screen.getByText(/INP 개선/)).toBeInTheDocument();
    });

    it('shows excellent message when no recommendations', () => {
      render(<PerformanceDashboard />);
      
      expect(screen.getByText('모든 성능 지표가 양호합니다!')).toBeInTheDocument();
    });

    it('allows dismissing recommendations', async () => {
      const recommendationsMockUsePerformance = {
        ...mockUsePerformance,
        getRecommendations: jest.fn(() => [
          'LCP 개선: 중요 리소스 preload, 이미지 최적화',
          'INP 개선: 긴 작업 분할, 코드 스플리팅',
        ]),
      };

      jest.mocked(require('../../shared/lib/performance/usePerformance').usePerformance)
        .mockReturnValue(recommendationsMockUsePerformance);

      render(<PerformanceDashboard />);
      
      const dismissButtons = screen.getAllByLabelText('권장사항 닫기');
      fireEvent.click(dismissButtons[0]);
      
      await waitFor(() => {
        expect(screen.queryByText(/LCP 개선/)).not.toBeInTheDocument();
      });
    });

    it('hides recommendations when showRecommendations is false', () => {
      const recommendationsMockUsePerformance = {
        ...mockUsePerformance,
        getRecommendations: jest.fn(() => ['Test recommendation']),
      };

      jest.mocked(require('../../shared/lib/performance/usePerformance').usePerformance)
        .mockReturnValue(recommendationsMockUsePerformance);

      render(<PerformanceDashboard showRecommendations={false} />);
      
      expect(screen.queryByText('성능 개선 권장사항')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('handles refresh button click', async () => {
      render(<PerformanceDashboard />);
      
      const refreshButton = screen.getByText('새로고침');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockUsePerformance.flushMetrics).toHaveBeenCalled();
      });
    });

    it('applies custom className', () => {
      const { container } = render(<PerformanceDashboard className="custom-dashboard" />);
      
      expect(container.firstChild).toHaveClass('custom-dashboard');
    });
  });

  describe('Disabled State', () => {
    it('shows disabled message when monitoring is off', () => {
      const disabledMockUsePerformance = {
        ...mockUsePerformance,
        isMonitoring: false,
      };

      jest.mocked(require('../../shared/lib/performance/usePerformance').usePerformance)
        .mockReturnValue(disabledMockUsePerformance);

      render(<PerformanceDashboard />);
      
      expect(screen.getByText('성능 모니터링이 비활성화되어 있습니다.')).toBeInTheDocument();
    });
  });

  describe('Performance Score Variants', () => {
    it('shows excellent score styling for high scores', () => {
      render(<PerformanceDashboard />);
      
      const scoreElement = screen.getByText('95');
      expect(scoreElement).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('shows poor score styling for low scores', () => {
      const poorScoreMockUsePerformance = {
        ...mockUsePerformance,
        performanceScore: 30,
      };

      jest.mocked(require('../../shared/lib/performance/usePerformance').usePerformance)
        .mockReturnValue(poorScoreMockUsePerformance);

      render(<PerformanceDashboard />);
      
      const scoreElement = screen.getByText('30');
      expect(scoreElement).toHaveClass('bg-red-100', 'text-red-800');
    });
  });
});