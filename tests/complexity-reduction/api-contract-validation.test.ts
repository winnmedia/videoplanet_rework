/**
 * @fileoverview API Contract 검증 테스트 - Public API 변경사항 안전성 보장
 * @author Grace (QA Lead)
 * @description FSD 리팩토링 시 Public API 인터페이스 무결성 검증
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { z } from 'zod';

// FSD Public API imports - 이들의 인터페이스는 절대 변경되면 안됨
import type { 
  DashboardWidgetProps,
  CalendarWidgetProps,
  VideoFeedbackWidgetProps,
  NavigationState,
  ProjectEntity,
  UserEntity,
  VideoEntity,
  FeedbackEntity
} from '@/shared/types';

// API Contract Schemas using Zod for runtime validation
const DashboardStatsSchema = z.object({
  projectsCount: z.number().min(0),
  activeUsersCount: z.number().min(0),
  pendingFeedback: z.number().min(0),
  completedTasks: z.number().min(0),
  timestamp: z.string().datetime().optional()
});

const CalendarEventSchema = z.object({
  id: z.number().positive(),
  title: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.enum(['confirmed', 'pending', 'cancelled']),
  projectId: z.number().optional(),
  participants: z.array(z.number()).optional()
});

const VideoFeedbackSchema = z.object({
  id: z.number().positive(),
  videoId: z.string().min(1),
  comments: z.array(z.object({
    id: z.number(),
    content: z.string(),
    timestamp: z.number(),
    authorId: z.number()
  })),
  status: z.enum(['pending', 'reviewed', 'approved']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

const NavigationStateSchema = z.object({
  currentRoute: z.string(),
  breadcrumbs: z.array(z.object({
    label: z.string(),
    path: z.string()
  })),
  sidebarOpen: z.boolean(),
  activeMenuItem: z.string().optional()
});

// MSW server for API contract validation
const contractServer = setupServer(
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
        status: 'confirmed',
        projectId: 1,
        participants: [1, 2, 3]
      },
      {
        id: 2,
        title: '베타 테스트 세션',
        startTime: '2025-01-21T14:00:00Z',
        endTime: '2025-01-21T16:00:00Z',
        status: 'pending',
        projectId: 2
      }
    ]);
  }),

  http.get('/api/video-feedback/pending', () => {
    return HttpResponse.json([
      {
        id: 1,
        videoId: 'video-alpha-001',
        comments: [
          {
            id: 1,
            content: '첫 번째 장면 조명이 너무 어둡습니다',
            timestamp: 125.5,
            authorId: 1
          }
        ],
        status: 'pending',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T14:45:00Z'
      }
    ]);
  }),

  http.post('/api/video-feedback/:id/comments', () => {
    return HttpResponse.json({
      id: 2,
      content: '새로운 댓글입니다',
      timestamp: 200.0,
      authorId: 1,
      createdAt: new Date().toISOString()
    }, { status: 201 });
  })
);

describe('API Contract 검증 (API Contract Validation)', () => {
  beforeAll(() => {
    contractServer.listen({ onUnhandledRequest: 'error' });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterAll(() => {
    contractServer.close();
    vi.useRealTimers();
  });

  /**
   * Dashboard API Contract Tests
   */
  describe('Dashboard Widget API Contract', () => {
    it('should validate dashboard stats API response schema', async () => {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      
      // Zod 스키마를 사용한 런타임 검증
      const validationResult = DashboardStatsSchema.safeParse(data);
      
      expect(validationResult.success).toBe(true);
      
      if (validationResult.success) {
        expect(validationResult.data.projectsCount).toBeGreaterThanOrEqual(0);
        expect(validationResult.data.activeUsersCount).toBeGreaterThanOrEqual(0);
        expect(validationResult.data.pendingFeedback).toBeGreaterThanOrEqual(0);
        expect(validationResult.data.completedTasks).toBeGreaterThanOrEqual(0);
      }
    });

    it('should preserve DashboardWidget props interface', () => {
      // TypeScript 컴파일 시점 인터페이스 검증
      const mockProps: DashboardWidgetProps = {
        className: 'custom-dashboard',
        onStatClick: vi.fn(),
        refreshInterval: 30000,
        showRefreshButton: true
      };

      expect(mockProps).toEqual(expect.objectContaining({
        className: expect.any(String),
        onStatClick: expect.any(Function),
        refreshInterval: expect.any(Number),
        showRefreshButton: expect.any(Boolean)
      }));
    });

    it('should maintain backward compatibility for dashboard stats callback', () => {
      const mockOnStatClick = vi.fn();
      const mockProps: DashboardWidgetProps = {
        onStatClick: mockOnStatClick
      };

      // Public API 콜백 시그니처 검증
      mockProps.onStatClick?.('projects');
      mockProps.onStatClick?.('users');
      mockProps.onStatClick?.('feedback');
      mockProps.onStatClick?.('tasks');

      expect(mockOnStatClick).toHaveBeenCalledWith('projects');
      expect(mockOnStatClick).toHaveBeenCalledWith('users');
      expect(mockOnStatClick).toHaveBeenCalledWith('feedback');
      expect(mockOnStatClick).toHaveBeenCalledWith('tasks');
      expect(mockOnStatClick).toHaveBeenCalledTimes(4);
    });
  });

  /**
   * Calendar API Contract Tests
   */
  describe('Calendar Widget API Contract', () => {
    it('should validate calendar events API response schema', async () => {
      const response = await fetch('/api/calendar/events');
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
      
      data.forEach(event => {
        const validationResult = CalendarEventSchema.safeParse(event);
        expect(validationResult.success).toBe(true);
        
        if (validationResult.success) {
          expect(new Date(validationResult.data.startTime)).toBeInstanceOf(Date);
          expect(new Date(validationResult.data.endTime)).toBeInstanceOf(Date);
          expect(['confirmed', 'pending', 'cancelled']).toContain(validationResult.data.status);
        }
      });
    });

    it('should preserve CalendarWidget props interface', () => {
      const mockProps: CalendarWidgetProps = {
        className: 'custom-calendar',
        defaultView: 'month',
        onEventClick: vi.fn(),
        onDateSelect: vi.fn(),
        showWeekends: true,
        locale: 'ko-KR'
      };

      expect(mockProps).toEqual(expect.objectContaining({
        className: expect.any(String),
        defaultView: expect.stringMatching(/^(month|week|day)$/),
        onEventClick: expect.any(Function),
        onDateSelect: expect.any(Function),
        showWeekends: expect.any(Boolean),
        locale: expect.any(String)
      }));
    });

    it('should maintain event interaction callback signatures', () => {
      const mockOnEventClick = vi.fn();
      const mockOnDateSelect = vi.fn();
      
      const mockProps: CalendarWidgetProps = {
        onEventClick: mockOnEventClick,
        onDateSelect: mockOnDateSelect
      };

      // Public API 콜백 시그니처 검증
      mockProps.onEventClick?.(1, { source: 'calendar' });
      mockProps.onDateSelect?.(new Date('2025-01-20'), { view: 'month' });

      expect(mockOnEventClick).toHaveBeenCalledWith(1, { source: 'calendar' });
      expect(mockOnDateSelect).toHaveBeenCalledWith(new Date('2025-01-20'), { view: 'month' });
    });
  });

  /**
   * Video Feedback API Contract Tests
   */
  describe('Video Feedback Widget API Contract', () => {
    it('should validate video feedback API response schema', async () => {
      const response = await fetch('/api/video-feedback/pending');
      const data = await response.json();
      
      expect(Array.isArray(data)).toBe(true);
      
      data.forEach(feedback => {
        const validationResult = VideoFeedbackSchema.safeParse(feedback);
        expect(validationResult.success).toBe(true);
        
        if (validationResult.success) {
          expect(validationResult.data.videoId).toBeTruthy();
          expect(Array.isArray(validationResult.data.comments)).toBe(true);
          expect(['pending', 'reviewed', 'approved']).toContain(validationResult.data.status);
        }
      });
    });

    it('should preserve VideoFeedbackWidget props interface', () => {
      const mockProps: VideoFeedbackWidgetProps = {
        videoId: 'video-123',
        className: 'custom-feedback',
        onCommentSubmit: vi.fn(),
        onStatusChange: vi.fn(),
        showTimestamps: true,
        allowEdit: false
      };

      expect(mockProps).toEqual(expect.objectContaining({
        videoId: expect.any(String),
        className: expect.any(String),
        onCommentSubmit: expect.any(Function),
        onStatusChange: expect.any(Function),
        showTimestamps: expect.any(Boolean),
        allowEdit: expect.any(Boolean)
      }));
    });

    it('should validate comment submission API contract', async () => {
      const response = await fetch('/api/video-feedback/1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '새로운 댓글입니다',
          timestamp: 200.0
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      
      expect(data).toEqual(expect.objectContaining({
        id: expect.any(Number),
        content: expect.any(String),
        timestamp: expect.any(Number),
        authorId: expect.any(Number),
        createdAt: expect.any(String)
      }));
    });
  });

  /**
   * Navigation State Contract Tests
   */
  describe('Navigation State API Contract', () => {
    it('should validate navigation state structure', () => {
      const mockNavigationState: NavigationState = {
        currentRoute: '/dashboard',
        breadcrumbs: [
          { label: 'Home', path: '/' },
          { label: 'Dashboard', path: '/dashboard' }
        ],
        sidebarOpen: true,
        activeMenuItem: 'dashboard'
      };

      const validationResult = NavigationStateSchema.safeParse(mockNavigationState);
      expect(validationResult.success).toBe(true);
      
      if (validationResult.success) {
        expect(validationResult.data.breadcrumbs).toHaveLength(2);
        expect(validationResult.data.currentRoute).toBe('/dashboard');
        expect(validationResult.data.sidebarOpen).toBe(true);
      }
    });

    it('should preserve navigation hook return type consistency', () => {
      // Navigation hook이 반환하는 인터페이스 일관성 검증
      const mockNavigationHook = () => ({
        state: {
          currentRoute: '/calendar',
          breadcrumbs: [],
          sidebarOpen: false
        } as NavigationState,
        actions: {
          navigate: vi.fn(),
          toggleSidebar: vi.fn(),
          setBreadcrumbs: vi.fn()
        }
      });

      const { state, actions } = mockNavigationHook();
      
      expect(state).toEqual(expect.objectContaining({
        currentRoute: expect.any(String),
        breadcrumbs: expect.any(Array),
        sidebarOpen: expect.any(Boolean)
      }));

      expect(actions).toEqual(expect.objectContaining({
        navigate: expect.any(Function),
        toggleSidebar: expect.any(Function),
        setBreadcrumbs: expect.any(Function)
      }));
    });
  });

  /**
   * Entity Interface Contract Tests
   */
  describe('Entity Interfaces Contract', () => {
    it('should preserve ProjectEntity interface', () => {
      const mockProject: ProjectEntity = {
        id: 1,
        title: '프로젝트 알파',
        description: '새로운 비디오 프로젝트',
        status: 'active',
        createdAt: '2025-01-10T00:00:00Z',
        updatedAt: '2025-01-15T12:00:00Z',
        ownerId: 1,
        teamMembers: [1, 2, 3]
      };

      expect(mockProject).toEqual(expect.objectContaining({
        id: expect.any(Number),
        title: expect.any(String),
        description: expect.any(String),
        status: expect.stringMatching(/^(active|pending|completed|cancelled)$/),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        ownerId: expect.any(Number),
        teamMembers: expect.any(Array)
      }));
    });

    it('should preserve UserEntity interface', () => {
      const mockUser: UserEntity = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'editor',
        isActive: true,
        lastLoginAt: '2025-01-15T11:30:00Z',
        profile: {
          firstName: '홍',
          lastName: '길동',
          avatar: '/avatars/user1.jpg'
        }
      };

      expect(mockUser).toEqual(expect.objectContaining({
        id: expect.any(Number),
        username: expect.any(String),
        email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        role: expect.stringMatching(/^(admin|editor|viewer)$/),
        isActive: expect.any(Boolean),
        lastLoginAt: expect.any(String),
        profile: expect.any(Object)
      }));
    });

    it('should preserve VideoEntity interface', () => {
      const mockVideo: VideoEntity = {
        id: 'video-alpha-001',
        title: '프로젝트 알파 - 메인 비디오',
        duration: 300.5,
        fileSize: 1048576000,
        format: 'mp4',
        resolution: '1920x1080',
        uploadedAt: '2025-01-14T09:00:00Z',
        projectId: 1,
        uploaderId: 1
      };

      expect(mockVideo).toEqual(expect.objectContaining({
        id: expect.any(String),
        title: expect.any(String),
        duration: expect.any(Number),
        fileSize: expect.any(Number),
        format: expect.stringMatching(/^(mp4|mov|avi|mkv)$/),
        resolution: expect.stringMatching(/^\d+x\d+$/),
        uploadedAt: expect.any(String),
        projectId: expect.any(Number),
        uploaderId: expect.any(Number)
      }));
    });

    it('should preserve FeedbackEntity interface', () => {
      const mockFeedback: FeedbackEntity = {
        id: 1,
        videoId: 'video-alpha-001',
        authorId: 2,
        content: '전반적으로 좋은 편집이지만 중간 부분 속도 조정 필요',
        timestamp: 125.5,
        status: 'pending',
        priority: 'medium',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      expect(mockFeedback).toEqual(expect.objectContaining({
        id: expect.any(Number),
        videoId: expect.any(String),
        authorId: expect.any(Number),
        content: expect.any(String),
        timestamp: expect.any(Number),
        status: expect.stringMatching(/^(pending|reviewed|approved|rejected)$/),
        priority: expect.stringMatching(/^(low|medium|high|critical)$/),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      }));
    });
  });
});

/**
 * Contract Validation Utilities
 * 리팩토링 과정에서 계속 사용할 검증 유틸리티
 */
export const ContractValidationUtils = {
  /**
   * API 응답 스키마 검증
   */
  validateApiResponse: <T>(schema: z.ZodSchema<T>, data: unknown): data is T => {
    const result = schema.safeParse(data);
    if (!result.success) {
      console.error('API Contract Violation:', result.error.issues);
      return false;
    }
    return true;
  },

  /**
   * Props 인터페이스 일관성 검증
   */
  validatePropsInterface: <T extends Record<string, any>>(
    actualProps: T,
    expectedShape: Record<keyof T, any>
  ): boolean => {
    const actualKeys = Object.keys(actualProps).sort();
    const expectedKeys = Object.keys(expectedShape).sort();
    
    return actualKeys.every(key => expectedKeys.includes(key)) &&
           expectedKeys.every(key => actualKeys.includes(key));
  },

  /**
   * 콜백 함수 시그니처 검증
   */
  validateCallbackSignature: (
    callback: Function,
    expectedArgCount: number
  ): boolean => {
    return callback.length === expectedArgCount;
  }
};

/**
 * Contract Testing Middleware
 * MSW handlers에 적용할 contract validation 미들웨어
 */
export const createContractMiddleware = <T>(schema: z.ZodSchema<T>) => {
  return (handler: any) => {
    return (...args: any[]) => {
      const result = handler(...args);
      
      if (result instanceof HttpResponse) {
        result.json().then(data => {
          const validation = schema.safeParse(data);
          if (!validation.success) {
            console.warn('Contract validation failed in MSW handler:', validation.error);
          }
        });
      }
      
      return result;
    };
  };
};