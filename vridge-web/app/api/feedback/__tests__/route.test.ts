/**
 * @fileoverview Feedback API Route Integration Tests
 * @description 피드백 API 엔드포인트의 통합 테스트
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { POST, GET } from '../route'

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('Feedback API Routes', () => {
  beforeEach(() => {
    // 각 테스트 전에 mock 초기화
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()
  })

  describe('POST /api/feedback', () => {
    it('유효한 피드백 생성 요청을 처리해야 함', async () => {
      const validRequestBody = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        videoId: '123e4567-e89b-12d3-a456-426614174001',
        timecode: 120.5,
        content: '이 부분에서 UI가 약간 어색해 보입니다.',
        type: 'suggestion',
        priority: 'medium',
        tags: ['ui', 'design'],
      }

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.success).toBe(true)
      expect(responseData.feedback).toBeDefined()
      expect(responseData.feedback.id).toBeDefined()
      expect(responseData.feedback.projectId).toBe(validRequestBody.projectId)
      expect(responseData.feedback.content).toBe(validRequestBody.content)
      expect(responseData.feedback.type).toBe(validRequestBody.type)
      expect(responseData.feedback.priority).toBe(validRequestBody.priority)
      expect(responseData.feedback.status).toBe('open')
      expect(responseData.feedback.author).toBeDefined()
      expect(responseData.feedback.createdAt).toBeDefined()
      expect(responseData.message).toBe('피드백이 성공적으로 추가되었습니다.')
    })

    it('최소한의 필드로도 피드백을 생성할 수 있어야 함', async () => {
      const minimalRequestBody = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        content: '간단한 피드백입니다.',
      }

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify(minimalRequestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.success).toBe(true)
      expect(responseData.feedback.type).toBe('comment') // 기본값
      expect(responseData.feedback.priority).toBe('medium') // 기본값
    })

    it('잘못된 UUID 형식을 거부해야 함', async () => {
      const invalidRequestBody = {
        projectId: 'invalid-uuid-format',
        content: '테스트 피드백',
      }

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Validation failed')
      expect(responseData.details).toBeDefined()
      expect(responseData.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: expect.any(String),
            message: expect.stringContaining('UUID'),
            path: expect.arrayContaining(['projectId']),
          }),
        ])
      )
    })

    it('필수 필드 누락 시 400 에러를 반환해야 함', async () => {
      const incompleteRequestBody = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        // content 누락
      }

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify(incompleteRequestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Validation failed')
    })

    it('내용 길이 제한을 초과하면 400 에러를 반환해야 함', async () => {
      const longContent = 'a'.repeat(2001) // 2000자 초과

      const requestBody = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        content: longContent,
      }

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
    })

    it('잘못된 JSON 형식을 처리해야 함', async () => {
      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Internal server error')
    })

    it('음수 타임코드를 거부해야 함', async () => {
      const requestBody = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        content: '테스트 피드백',
        timecode: -1,
      }

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
    })
  })

  describe('GET /api/feedback', () => {
    // 테스트용 피드백을 미리 생성
    const setupTestFeedbacks = async () => {
      const testFeedbacks = [
        {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          videoId: '123e4567-e89b-12d3-a456-426614174001',
          content: '첫 번째 피드백',
          type: 'comment',
          timecode: 10,
        },
        {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          videoId: '123e4567-e89b-12d3-a456-426614174001',
          content: '두 번째 피드백',
          type: 'suggestion',
          timecode: 20,
        },
        {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          videoId: '123e4567-e89b-12d3-a456-426614174002',
          content: '다른 비디오 피드백',
          type: 'issue',
          timecode: 5,
        },
      ]

      // 각 테스트 피드백 생성
      for (const feedback of testFeedbacks) {
        const request = new NextRequest('http://localhost:3000/api/feedback', {
          method: 'POST',
          body: JSON.stringify(feedback),
        })
        await POST(request)
      }
    }

    it('프로젝트별 피드백 목록을 조회해야 함', async () => {
      await setupTestFeedbacks()

      const url = new URL('http://localhost:3000/api/feedback')
      url.searchParams.set('projectId', '123e4567-e89b-12d3-a456-426614174000')

      const request = new NextRequest(url.toString(), { method: 'GET' })
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.feedbacks).toBeDefined()
      expect(Array.isArray(responseData.feedbacks)).toBe(true)
      expect(responseData.feedbacks.length).toBeGreaterThan(0)
      expect(responseData.pagination).toBeDefined()
      expect(responseData.pagination.total).toBe(responseData.feedbacks.length)
    })

    it('비디오별 필터링이 작동해야 함', async () => {
      await setupTestFeedbacks()

      const url = new URL('http://localhost:3000/api/feedback')
      url.searchParams.set('projectId', '123e4567-e89b-12d3-a456-426614174000')
      url.searchParams.set('videoId', '123e4567-e89b-12d3-a456-426614174001')

      const request = new NextRequest(url.toString(), { method: 'GET' })
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.feedbacks).toBeDefined()

      // 특정 비디오의 피드백만 반환되어야 함
      responseData.feedbacks.forEach((feedback: any) => {
        expect(feedback.videoId).toBe('123e4567-e89b-12d3-a456-426614174001')
      })
    })

    it('타입별 필터링이 작동해야 함', async () => {
      await setupTestFeedbacks()

      const url = new URL('http://localhost:3000/api/feedback')
      url.searchParams.set('type', 'suggestion')

      const request = new NextRequest(url.toString(), { method: 'GET' })
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.feedbacks).toBeDefined()

      // suggestion 타입의 피드백만 반환되어야 함
      responseData.feedbacks.forEach((feedback: any) => {
        expect(feedback.type).toBe('suggestion')
      })
    })

    it('페이지네이션이 올바르게 작동해야 함', async () => {
      await setupTestFeedbacks()

      const url = new URL('http://localhost:3000/api/feedback')
      url.searchParams.set('page', '1')
      url.searchParams.set('limit', '2')

      const request = new NextRequest(url.toString(), { method: 'GET' })
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.feedbacks.length).toBeLessThanOrEqual(2)
      expect(responseData.pagination.page).toBe(1)
      expect(responseData.pagination.limit).toBe(2)
      expect(responseData.pagination.totalPages).toBeGreaterThanOrEqual(1)
    })

    it('잘못된 페이지 파라미터를 거부해야 함', async () => {
      const url = new URL('http://localhost:3000/api/feedback')
      url.searchParams.set('page', '0') // 양수가 아님

      const request = new NextRequest(url.toString(), { method: 'GET' })
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Invalid query parameters')
    })

    it('정렬이 올바르게 작동해야 함', async () => {
      await setupTestFeedbacks()

      const url = new URL('http://localhost:3000/api/feedback')
      url.searchParams.set('sortBy', 'timecode')
      url.searchParams.set('sortOrder', 'asc')

      const request = new NextRequest(url.toString(), { method: 'GET' })
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.feedbacks).toBeDefined()

      // 타임코드 순으로 오름차순 정렬되어야 함
      if (responseData.feedbacks.length > 1) {
        for (let i = 0; i < responseData.feedbacks.length - 1; i++) {
          const currentTimecode = responseData.feedbacks[i].timecode || 0
          const nextTimecode = responseData.feedbacks[i + 1].timecode || 0
          expect(currentTimecode).toBeLessThanOrEqual(nextTimecode)
        }
      }
    })

    it('빈 결과를 올바르게 처리해야 함', async () => {
      const url = new URL('http://localhost:3000/api/feedback')
      url.searchParams.set('projectId', '00000000-0000-0000-0000-000000000000') // 존재하지 않는 프로젝트

      const request = new NextRequest(url.toString(), { method: 'GET' })
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.feedbacks).toEqual([])
      expect(responseData.pagination.total).toBe(0)
    })

    it('잘못된 UUID 파라미터를 거부해야 함', async () => {
      const url = new URL('http://localhost:3000/api/feedback')
      url.searchParams.set('projectId', 'invalid-uuid')

      const request = new NextRequest(url.toString(), { method: 'GET' })
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Invalid query parameters')
    })
  })

  describe('Error Handling', () => {
    it('개발 환경에서만 상세한 에러 정보를 노출해야 함', async () => {
      const originalEnv = process.env.NODE_ENV

      // 프로덕션 환경 시뮬레이션
      process.env.NODE_ENV = 'production'

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(responseData.details).toBeUndefined() // 프로덕션에서는 상세 에러 정보 숨김

      // 원래 환경 복원
      process.env.NODE_ENV = originalEnv
    })

    it('예상치 못한 에러를 안전하게 처리해야 함', async () => {
      // null 값이 전달되면 스키마 검증에서 400으로 처리되므로,
      // 이는 정상적인 동작입니다.
      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify(null),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400) // 스키마 검증 실패로 400이 맞습니다
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Validation failed')
      expect(responseData.message).toBe('입력 데이터가 올바르지 않습니다.')
    })
  })
})
