/**
 * @file Store Type System Tests
 * @description Redux Toolkit 2.0 통합 스토어 타입 시스템 테스트
 */

import { z } from 'zod'
import {
  // 도메인 엔티티 스키마
  UserSchema,
  ProjectSchema, 
  VideoFeedbackSchema,
  CalendarEventSchema,
  
  // 상태 스키마
  AuthStateSchema,
  PipelineStateSchema,
  ProjectManagementStateSchema,
  VideoFeedbackStateSchema,
  CalendarStateSchema,
  
  // 통합 스토어 스키마
  RootStateSchema,
  
  // 타입 추출
  type User,
  type Project,
  type VideoFeedback,
  type CalendarEvent,
  type AuthState,
  type PipelineState,
  type ProjectManagementState,
  type VideoFeedbackState,
  type CalendarState,
  type RootState
} from '../types/store'

describe('Store Type System', () => {
  describe('도메인 엔티티 스키마 검증', () => {
    test('UserSchema는 유효한 사용자 객체를 검증해야 한다', () => {
      const validUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z'
      }

      expect(() => UserSchema.parse(validUser)).not.toThrow()
      
      const parsedUser = UserSchema.parse(validUser)
      expect(parsedUser).toEqual(validUser)
    })

    test('UserSchema는 잘못된 이메일 형식을 거부해야 한다', () => {
      const invalidUser = {
        id: 'user-123',
        email: 'invalid-email',
        name: 'Test User'
      }

      expect(() => UserSchema.parse(invalidUser)).toThrow()
    })

    test('ProjectSchema는 필수 필드 누락 시 실패해야 한다', () => {
      const invalidProject = {
        name: 'Test Project'
        // id, status, createdAt 누락
      }

      expect(() => ProjectSchema.parse(invalidProject)).toThrow()
    })
  })

  describe('상태 스키마 검증', () => {
    test('AuthStateSchema는 초기 상태를 검증해야 한다', () => {
      const initialAuthState = {
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
        token: null,
        refreshToken: null
      }

      expect(() => AuthStateSchema.parse(initialAuthState)).not.toThrow()
    })

    test('PipelineStateSchema는 Set 타입 completedSteps를 처리해야 한다', () => {
      const pipelineState = {
        currentStep: 'signup' as const,
        completedSteps: ['login', 'project'],
        userProgress: {
          profile: null,
          projects: [],
          currentProject: null,
          planningDrafts: []
        },
        sessionData: {
          startedAt: null,
          lastActivity: null,
          timeSpent: 0
        },
        isLoading: false,
        error: null
      }

      expect(() => PipelineStateSchema.parse(pipelineState)).not.toThrow()
    })
  })

  describe('통합 스토어 스키마', () => {
    test('RootStateSchema는 모든 슬라이스 상태를 검증해야 한다', () => {
      const rootState = {
        auth: {
          isAuthenticated: true,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User'
          },
          loading: false,
          error: null,
          token: 'access-token',
          refreshToken: 'refresh-token'
        },
        pipeline: {
          currentStep: 'project',
          completedSteps: ['signup', 'login'],
          userProgress: {
            profile: null,
            projects: [],
            currentProject: null,
            planningDrafts: []
          },
          sessionData: {
            startedAt: '2024-01-01T00:00:00Z',
            lastActivity: '2024-01-01T01:00:00Z',
            timeSpent: 3600
          },
          isLoading: false,
          error: null
        },
        projectManagement: {
          projects: [],
          currentProject: null,
          loading: false,
          error: null,
          pagination: {
            page: 1,
            pageSize: 10,
            total: 0,
            hasNext: false,
            hasPrev: false
          }
        },
        videoFeedback: {
          feedbacks: [],
          currentFeedback: null,
          loading: false,
          error: null
        },
        calendar: {
          events: [],
          selectedDate: new Date().toISOString(),
          view: 'month',
          loading: false,
          error: null
        }
      }

      expect(() => RootStateSchema.parse(rootState)).not.toThrow()
    })
  })

  describe('타입 안전성', () => {
    test('추출된 타입들이 스키마와 일치해야 한다', () => {
      // TypeScript 컴파일 타임에 검증됨
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      }

      const project: Project = {
        id: 'proj-123',
        name: 'Test Project',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z'
      }

      // 런타임 검증
      expect(() => UserSchema.parse(user)).not.toThrow()
      expect(() => ProjectSchema.parse(project)).not.toThrow()
    })
  })

  describe('에러 처리', () => {
    test('스키마 검증 실패 시 구체적인 에러 정보를 제공해야 한다', () => {
      const invalidState = {
        auth: {
          isAuthenticated: 'not-boolean', // 잘못된 타입
          user: null
        }
      }

      try {
        RootStateSchema.parse(invalidState)
        fail('스키마 검증이 실패해야 합니다')
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError)
        if (error instanceof z.ZodError) {
          expect(error.issues.length).toBeGreaterThan(0)
          expect(error.issues[0].path).toContain('auth')
        }
      }
    })
  })
})