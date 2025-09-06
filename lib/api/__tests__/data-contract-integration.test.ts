/**
 * 데이터 계약 통합 테스트
 * MSW와 실제 API 엔드포인트 간 스키마 검증 통합성 확인
 */

import { setupServer } from 'msw/node'
import { handlers } from '@/lib/api/msw-handlers'
import { ProjectsResponseSchema, FeedbacksResponseSchema } from '@/shared/api/schemas'

// MSW 서버 설정
const server = setupServer(...handlers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

describe('데이터 계약 통합 테스트', () => {
  describe('프로젝트 API 통합', () => {
    it('/api/projects 엔드포인트가 ProjectsResponseSchema 검증을 통과해야 함', async () => {
      // API 호출 (MSW 핸들러에서 처리되는 URL 패턴 사용)
      const response = await fetch('https://localhost:3000/api/projects?page=1&limit=10')
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      
      // 스키마 검증
      expect(() => {
        ProjectsResponseSchema.parse(data)
      }).not.toThrow()
      
      // 실제 데이터 구조 검증
      expect(data.success).toBe(true)
      expect(data.data.items).toBeInstanceOf(Array)
      expect(data.data.pagination).toBeDefined()
      
      // UUID 형식 검증 (올바른 UUID v4 정규식)
      data.data.items.forEach((project: any) => {
        expect(project.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        if (project.ownerId) {
          expect(project.ownerId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        }
      })
    })

    it('프로젝트 생성 API가 올바른 UUID를 반환해야 함', async () => {
      const projectData = {
        title: '테스트 프로젝트',
        description: '통합 테스트용 프로젝트',
        tags: ['test']
      }

      const response = await fetch('https://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      
      expect(result.success).toBe(true)
      expect(result.data.project.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })
  })

  describe('피드백 API 통합', () => {
    it('/api/feedback 엔드포인트가 FeedbacksResponseSchema 검증을 통과해야 함', async () => {
      const response = await fetch('https://localhost:3000/api/feedback?page=1&limit=10')
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      
      // 스키마 검증
      expect(() => {
        FeedbacksResponseSchema.parse(data)
      }).not.toThrow()
      
      // UUID 형식 검증
      data.data.items.forEach((feedback: any) => {
        expect(feedback.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        expect(feedback.authorId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        
        if (feedback.projectId) {
          expect(feedback.projectId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        }
      })
    })
  })

  describe('Video Feedback API 통합', () => {
    it('댓글 생성 시 crypto.randomUUID()로 생성된 ID 검증', async () => {
      const commentData = {
        videoId: 'video-001',
        timestamp: 30.5,
        content: '테스트 댓글',
        author: {
          id: 'user-test-001',
          name: '테스트 사용자',
          role: 'client'
        },
        status: 'open',
        priority: 'medium',
        tags: ['test']
      }

      const response = await fetch('https://localhost:3000/api/video-feedback/sessions/session-001/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commentData)
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      
      expect(result.success).toBe(true)
      
      // 새로 생성된 댓글의 ID가 UUID 형식인지 확인
      const newComment = result.session.comments.find((c: any) => c.content === '테스트 댓글')
      expect(newComment).toBeDefined()
      expect(newComment.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('마커 생성 시 crypto.randomUUID()로 생성된 ID 검증', async () => {
      const markerData = {
        videoId: 'video-001',
        timestamp: 45.0,
        type: 'rectangle',
        coordinates: {
          x: 30.0,
          y: 40.0,
          width: 20.0,
          height: 15.0
        },
        style: {
          color: '#ff0000',
          strokeWidth: 2,
          opacity: 0.8
        },
        createdBy: 'user-test-001'
      }

      const response = await fetch('https://localhost:3000/api/video-feedback/sessions/session-001/markers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(markerData)
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      
      expect(result.success).toBe(true)
      
      // 새로 생성된 마커의 ID가 UUID 형식인지 확인
      const newMarker = result.session.markers.find((m: any) => m.coordinates.x === 30.0)
      expect(newMarker).toBeDefined()
      expect(newMarker.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })
  })

  describe('프로젝트 관리 API 통합', () => {
    it('팀원 초대 시 crypto.randomUUID()로 생성된 초대 ID 검증', async () => {
      const inviteData = {
        email: 'test@example.com',
        role: 'editor',
        message: '프로젝트에 참여해주세요'
      }

      const response = await fetch('https://localhost:3000/api/projects/test-project/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inviteData)
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      
      expect(result.success).toBe(true)
      expect(result.data.invitationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })
  })

  describe('성능 및 안정성', () => {
    it('대량 요청 시에도 일관된 UUID 형식 보장', async () => {
      const requests = Array.from({ length: 10 }, () => 
        fetch('https://localhost:3000/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `테스트 프로젝트 ${Math.random()}`,
            description: '성능 테스트용'
          })
        })
      )

      const responses = await Promise.all(requests)
      const results = await Promise.all(responses.map(r => r.json()))

      // 모든 응답이 성공하고 UUID 형식이 올바른지 확인
      results.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.data.project.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      })

      // UUID 중복이 없는지 확인
      const uuids = results.map(r => r.data.project.id)
      const uniqueUuids = new Set(uuids)
      expect(uniqueUuids.size).toBe(uuids.length)
    })
  })

  describe('에러 상황 처리', () => {
    it('잘못된 UUID로 조회 시 적절한 에러 응답', async () => {
      const response = await fetch('https://localhost:3000/api/video-feedback/sessions/invalid-uuid')
      
      // 404 또는 400 에러가 발생해야 함
      expect([404, 400].includes(response.status)).toBe(true)
      
      const error = await response.json()
      expect(error.success).toBe(false)
      expect(error.message).toBeDefined()
    })
  })
})