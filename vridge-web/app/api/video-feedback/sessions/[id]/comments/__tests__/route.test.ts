/**
 * @fileoverview Video Feedback Comments API Tests
 * @description 타임코드 기반 댓글 시스템의 핵심 테스트
 */

import { NextRequest } from 'next/server'

import { parseTimecode } from '@/features/video-feedback/lib/timecodeUtils'

import { GET, POST } from '../route'

describe('Video Feedback Comments API', () => {
  const mockSessionId = '123e4567-e89b-12d3-a456-426614174001'

  describe('POST /api/video-feedback/sessions/[id]/comments', () => {
    it('should add a comment with valid timecode', async () => {
      const requestData = {
        content: '이 부분 [02:30.500]에서 음성이 너무 작습니다.',
        author: {
          id: crypto.randomUUID(),
          name: '김테스터',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        status: 'active',
      }

      const request = new NextRequest(`http://localhost:3000/api/video-feedback/sessions/${mockSessionId}/comments`, {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request, { params: { id: mockSessionId } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.comment).toBeDefined()
      expect(data.comment.id).toBeDefined()
      expect(data.comment.content).toBe(requestData.content)
      expect(data.comment.timestamp).toBeDefined()

      // 타임코드 파싱 검증
      const timecodeInContent = data.comment.content.match(/\[(\d{2}):(\d{2})\.(\d{3})\]/)?.[0]
      if (timecodeInContent) {
        const parsedTime = parseTimecode(timecodeInContent)
        expect(parsedTime).toBe(150.5) // 2분 30.5초 = 150.5초
      }
    })

    it('should add a comment without timecode', async () => {
      const requestData = {
        content: '전체적으로 영상 품질이 좋습니다.',
        author: {
          id: crypto.randomUUID(),
          name: '박리뷰어',
        },
        status: 'active',
      }

      const request = new NextRequest(`http://localhost:3000/api/video-feedback/sessions/${mockSessionId}/comments`, {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request, { params: { id: mockSessionId } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.comment.timestamp).toBeUndefined()
    })

    it('should return 400 for invalid session ID', async () => {
      const requestData = {
        content: '테스트 댓글',
        author: {
          id: crypto.randomUUID(),
          name: '김테스터',
        },
        status: 'active',
      }

      const request = new NextRequest('http://localhost:3000/api/video-feedback/sessions/invalid-id/comments', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request, { params: { id: 'invalid-id' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('유효하지 않은 세션 ID')
    })

    it('should return 400 for missing content', async () => {
      const requestData = {
        author: {
          id: crypto.randomUUID(),
          name: '김테스터',
        },
        status: 'active',
      }

      const request = new NextRequest(`http://localhost:3000/api/video-feedback/sessions/${mockSessionId}/comments`, {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request, { params: { id: mockSessionId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('content')
    })
  })

  describe('GET /api/video-feedback/sessions/[id]/comments', () => {
    it('should return comments sorted by timecode', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-feedback/sessions/${mockSessionId}/comments`)

      const response = await GET(request, { params: { id: mockSessionId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.comments)).toBe(true)

      // 타임코드 순으로 정렬되었는지 확인
      const commentsWithTimecode = data.comments.filter(
        (comment: Record<string, unknown>) => comment.timestamp !== undefined
      )
      for (let i = 1; i < commentsWithTimecode.length; i++) {
        expect(commentsWithTimecode[i].timestamp).toBeGreaterThanOrEqual(commentsWithTimecode[i - 1].timestamp)
      }
    })

    it('should return empty array for non-existent session with valid UUID', async () => {
      const nonExistentId = '99999999-9999-1999-8999-999999999999'
      const request = new NextRequest(`http://localhost:3000/api/video-feedback/sessions/${nonExistentId}/comments`)

      const response = await GET(request, { params: { id: nonExistentId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.comments).toEqual([])
      expect(data.total).toBe(0)
    })

    it('should filter comments by timecode range', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/video-feedback/sessions/${mockSessionId}/comments?startTime=30&endTime=120`
      )

      const response = await GET(request, { params: { id: mockSessionId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // 시간 범위 내의 댓글만 반환되었는지 확인
      data.comments.forEach((comment: Record<string, unknown>) => {
        if (comment.timestamp !== undefined) {
          expect(comment.timestamp).toBeGreaterThanOrEqual(30)
          expect(comment.timestamp).toBeLessThanOrEqual(120)
        }
      })
    })
  })
})
