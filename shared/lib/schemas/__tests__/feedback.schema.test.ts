/**
 * @fileoverview Feedback Schema Unit Tests
 * @description 피드백 스키마의 유효성 검증 및 타입 안전성 테스트
 */

import { describe, it, expect } from 'vitest'

import {
  UUIDSchema,
  FeedbackTypeSchema,
  FeedbackPrioritySchema,
  FeedbackStatusSchema,
  CreateFeedbackRequestSchema,
  UpdateFeedbackRequestSchema,
  FeedbackQuerySchema,
  FeedbackSchema,
  validateFeedbackData,
  isValidFeedback,
  isValidUUID,
  type CreateFeedbackRequest,
  type Feedback,
} from '../feedback.schema'

describe('Feedback Schema Validation', () => {
  describe('Base Schema Validation', () => {
    describe('UUIDSchema', () => {
      it('유효한 UUID v4를 통과시켜야 함', () => {
        const validUUID = '123e4567-e89b-12d3-a456-426614174000'
        expect(() => UUIDSchema.parse(validUUID)).not.toThrow()
      })

      it('잘못된 UUID 형식을 거부해야 함', () => {
        const invalidUUIDs = [
          'invalid-uuid',
          '123',
          '',
          '123e4567-e89b-12d3-a456', // 너무 짧음
          '123e4567-e89b-12d3-a456-426614174000-extra', // 너무 김
          null,
          undefined,
        ]

        invalidUUIDs.forEach(uuid => {
          expect(() => UUIDSchema.parse(uuid)).toThrow()
        })
      })
    })

    describe('FeedbackTypeSchema', () => {
      it('유효한 피드백 타입을 통과시켜야 함', () => {
        const validTypes = ['comment', 'suggestion', 'issue', 'approval']
        validTypes.forEach(type => {
          expect(() => FeedbackTypeSchema.parse(type)).not.toThrow()
        })
      })

      it('잘못된 피드백 타입을 거부해야 함', () => {
        const invalidTypes = ['invalid', 'bug', 'feature', '']
        invalidTypes.forEach(type => {
          expect(() => FeedbackTypeSchema.parse(type)).toThrow()
        })
      })
    })

    describe('FeedbackPrioritySchema', () => {
      it('유효한 우선순위를 통과시켜야 함', () => {
        const validPriorities = ['low', 'medium', 'high', 'critical']
        validPriorities.forEach(priority => {
          expect(() => FeedbackPrioritySchema.parse(priority)).not.toThrow()
        })
      })
    })

    describe('FeedbackStatusSchema', () => {
      it('유효한 상태를 통과시켜야 함', () => {
        const validStatuses = ['open', 'in_progress', 'resolved', 'closed']
        validStatuses.forEach(status => {
          expect(() => FeedbackStatusSchema.parse(status)).not.toThrow()
        })
      })
    })
  })

  describe('CreateFeedbackRequestSchema', () => {
    const validBaseRequest: CreateFeedbackRequest = {
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      content: '테스트 피드백 내용입니다.',
      type: 'comment',
      priority: 'medium',
    }

    it('유효한 피드백 생성 요청을 통과시켜야 함', () => {
      expect(() => CreateFeedbackRequestSchema.parse(validBaseRequest)).not.toThrow()
    })

    it('선택적 필드를 포함한 요청을 통과시켜야 함', () => {
      const requestWithOptionals = {
        ...validBaseRequest,
        videoId: '123e4567-e89b-12d3-a456-426614174001',
        timecode: 120.5,
        tags: ['urgent', 'ui'],
        assigneeId: '123e4567-e89b-12d3-a456-426614174002',
      }

      expect(() => CreateFeedbackRequestSchema.parse(requestWithOptionals)).not.toThrow()
    })

    it('기본값이 올바르게 적용되어야 함', () => {
      const minimalRequest = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        content: '테스트 피드백',
      }

      const result = CreateFeedbackRequestSchema.parse(minimalRequest)
      expect(result.type).toBe('comment')
      expect(result.priority).toBe('medium')
    })

    it('필수 필드가 누락되면 에러를 발생시켜야 함', () => {
      const incompleteRequests = [
        { projectId: '123e4567-e89b-12d3-a456-426614174000' }, // content 누락
        { content: '테스트 내용' }, // projectId 누락
        {}, // 모든 필드 누락
      ]

      incompleteRequests.forEach(request => {
        expect(() => CreateFeedbackRequestSchema.parse(request)).toThrow()
      })
    })

    it('콘텐츠 길이 제한을 검증해야 함', () => {
      const longContent = 'a'.repeat(2001) // 2000자 초과

      expect(() =>
        CreateFeedbackRequestSchema.parse({
          ...validBaseRequest,
          content: longContent,
        })
      ).toThrow()

      expect(() =>
        CreateFeedbackRequestSchema.parse({
          ...validBaseRequest,
          content: '', // 빈 문자열
        })
      ).toThrow()
    })

    it('타임코드 음수를 거부해야 함', () => {
      expect(() =>
        CreateFeedbackRequestSchema.parse({
          ...validBaseRequest,
          timecode: -1,
        })
      ).toThrow()
    })

    it('태그 개수 제한을 검증해야 함', () => {
      const tooManyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`)

      expect(() =>
        CreateFeedbackRequestSchema.parse({
          ...validBaseRequest,
          tags: tooManyTags,
        })
      ).toThrow()
    })
  })

  describe('FeedbackQuerySchema', () => {
    it('기본값이 올바르게 적용되어야 함', () => {
      const result = FeedbackQuerySchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.sortBy).toBe('createdAt')
      expect(result.sortOrder).toBe('desc')
    })

    it('유효한 쿼리 파라미터를 통과시켜야 함', () => {
      const validQuery = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'issue',
        priority: 'high',
        page: '2',
        limit: '10',
      }

      const result = FeedbackQuerySchema.parse(validQuery)
      expect(result.page).toBe(2)
      expect(result.limit).toBe(10)
    })

    it('페이지네이션 제한을 검증해야 함', () => {
      expect(() => FeedbackQuerySchema.parse({ page: '0' })).toThrow() // 양수가 아님
      expect(() => FeedbackQuerySchema.parse({ limit: '101' })).toThrow() // 최대 100 초과
      expect(() => FeedbackQuerySchema.parse({ page: 'invalid' })).toThrow() // 숫자가 아님
    })
  })

  describe('FeedbackSchema (Complete)', () => {
    const validFeedback: Feedback = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
      videoId: '123e4567-e89b-12d3-a456-426614174002',
      timecode: 120.5,
      content: '테스트 피드백 내용입니다.',
      type: 'comment',
      priority: 'medium',
      status: 'open',
      tags: ['ui', 'bug'],
      author: {
        id: '123e4567-e89b-12d3-a456-426614174003',
        name: 'Test User',
        email: 'test@example.com',
        role: 'reviewer',
      },
      reactions: [],
      replies: [],
      attachments: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    it('완전한 피드백 객체를 통과시켜야 함', () => {
      expect(() => FeedbackSchema.parse(validFeedback)).not.toThrow()
    })

    it('필수 필드가 누락되면 에러를 발생시켜야 함', () => {
      const { id, ...incompleteDataInput } = validFeedback
      expect(() => FeedbackSchema.parse(incompleteDataInput)).toThrow()
    })

    it('중첩된 객체 검증이 올바르게 작동해야 함', () => {
      const invalidAuthor = {
        ...validFeedback,
        author: {
          id: 'invalid-uuid',
          name: '',
          email: 'invalid-email',
        },
      }

      expect(() => FeedbackSchema.parse(invalidAuthor)).toThrow()
    })
  })

  describe('Utility Functions', () => {
    describe('validateFeedbackData', () => {
      it('성공적인 검증 결과를 반환해야 함', () => {
        const validData = {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          content: '테스트 피드백',
        }

        const result = validateFeedbackData(CreateFeedbackRequestSchema, validData)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.projectId).toBe(validData.projectId)
          expect(result.data.content).toBe(validData.content)
        }
      })

      it('실패한 검증 결과를 반환해야 함', () => {
        const invalidData = {
          projectId: 'invalid-uuid',
          content: '', // 빈 문자열
        }

        const result = validateFeedbackData(CreateFeedbackRequestSchema, invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errors).toHaveLength(2) // projectId와 content 에러
        }
      })
    })

    describe('isValidFeedback', () => {
      it('유효한 피드백 객체에 대해 true를 반환해야 함', () => {
        const validFeedback: Feedback = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          projectId: '123e4567-e89b-12d3-a456-426614174001',
          content: '테스트 피드백',
          type: 'comment',
          priority: 'medium',
          status: 'open',
          author: {
            id: '123e4567-e89b-12d3-a456-426614174003',
            name: 'Test User',
          },
          reactions: [],
          replies: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        }

        expect(isValidFeedback(validFeedback)).toBe(true)
      })

      it('잘못된 객체에 대해 false를 반환해야 함', () => {
        expect(isValidFeedback({})).toBe(false)
        expect(isValidFeedback(null)).toBe(false)
        expect(isValidFeedback('string')).toBe(false)
      })
    })

    describe('isValidUUID', () => {
      it('유효한 UUID에 대해 true를 반환해야 함', () => {
        expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
      })

      it('잘못된 UUID에 대해 false를 반환해야 함', () => {
        expect(isValidUUID('invalid-uuid')).toBe(false)
        expect(isValidUUID('')).toBe(false)
      })
    })
  })

  describe('Error Handling Edge Cases', () => {
    it('null 값들을 올바르게 처리해야 함', () => {
      const testCases = [null, undefined, '', 0, false, []]

      testCases.forEach(testCase => {
        const result = validateFeedbackData(CreateFeedbackRequestSchema, testCase)
        expect(result.success).toBe(false)
      })
    })

    it('타입 강제 변환이 올바르게 작동해야 함', () => {
      const queryWithStrings = {
        page: '3',
        limit: '15',
      }

      const result = validateFeedbackData(FeedbackQuerySchema, queryWithStrings)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(3)
        expect(result.data.limit).toBe(15)
      }
    })
  })
})
