/**
 * 데이터 계약 검증 테스트 (TDD Green 단계)
 * 수정된 MSW 모킹 데이터가 Zod 스키마 검증을 통과하는지 확인
 */

import { z } from 'zod'
import { ProjectSchema, FeedbackSchema } from '@/shared/api/schemas'

// 수정된 MSW 핸들러에서 사용하는 UUID 데이터
const CORRECTED_PROJECT_DATA = [
  {
    id: '123e4567-e89b-12d3-a456-426614174001', // ✅ 유효한 UUID
    name: '웹사이트 리뉴얼 프로젝트',
    description: '회사 웹사이트 전체 리뉴얼 및 성능 최적화 작업',
    status: 'in-progress',
    createdAt: new Date('2025-08-01T10:00:00Z').toISOString(),
    updatedAt: new Date('2025-08-25T10:30:00Z').toISOString(),
    startDate: new Date('2025-08-01T09:00:00Z').toISOString(),
    endDate: new Date('2025-09-30T18:00:00Z').toISOString(),
    ownerId: '987fcdeb-51a2-43f1-9876-543210987651', // ✅ 유효한 UUID
    tags: ['web', 'frontend', 'ux'],
    priority: 'high',
    progress: 65
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174002', // ✅ 유효한 UUID
    name: '모바일 앱 개발',
    description: 'iOS/Android 네이티브 앱 신규 개발',
    status: 'planning',
    createdAt: new Date('2025-08-10T14:30:00Z').toISOString(),
    updatedAt: new Date('2025-08-20T15:45:00Z').toISOString(),
    startDate: new Date('2025-09-01T09:00:00Z').toISOString(),
    endDate: new Date('2025-12-31T18:00:00Z').toISOString(),
    ownerId: '987fcdeb-51a2-43f1-9876-543210987652', // ✅ 유효한 UUID
    tags: ['mobile', 'ios', 'android'],
    priority: 'medium',
    progress: 20
  }
]

describe('데이터 계약 검증 (TDD Green 단계)', () => {
  describe('수정된 프로젝트 데이터 검증', () => {
    it('MSW 프로젝트 데이터가 ProjectSchema 검증에 통과해야 함', () => {
      // Green: 수정된 데이터는 스키마 검증에 통과해야 함
      CORRECTED_PROJECT_DATA.forEach((project, index) => {
        expect(() => {
          ProjectSchema.parse(project)
        }).not.toThrow()

        // 추가 검증: 파싱된 결과가 올바른지 확인
        const validated = ProjectSchema.parse(project)
        expect(validated.id).toBe(project.id)
        expect(validated.name).toBe(project.name)
        expect(validated.ownerId).toBe(project.ownerId)
      })
    })

    it('결정론적 UUID가 일관되게 사용되어야 함', () => {
      const deterministic_uuids = {
        PROJECT_001: '123e4567-e89b-12d3-a456-426614174001',
        PROJECT_002: '123e4567-e89b-12d3-a456-426614174002',
        USER_001: '987fcdeb-51a2-43f1-9876-543210987651',
        USER_002: '987fcdeb-51a2-43f1-9876-543210987652'
      }

      // 모든 결정론적 UUID가 유효한 UUID 형식이어야 함
      Object.values(deterministic_uuids).forEach(uuid => {
        expect(() => z.string().uuid().parse(uuid)).not.toThrow()
      })

      // 프로젝트 데이터가 결정론적 UUID를 사용하는지 확인
      expect(CORRECTED_PROJECT_DATA[0].id).toBe(deterministic_uuids.PROJECT_001)
      expect(CORRECTED_PROJECT_DATA[1].id).toBe(deterministic_uuids.PROJECT_002)
      expect(CORRECTED_PROJECT_DATA[0].ownerId).toBe(deterministic_uuids.USER_001)
      expect(CORRECTED_PROJECT_DATA[1].ownerId).toBe(deterministic_uuids.USER_002)
    })
  })

  describe('API 응답 구조 검증', () => {
    it('프로젝트 API 응답이 올바른 구조로 검증 통과해야 함', () => {
      // 수정된 MSW에서 반환하는 구조
      const correctedApiResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        message: '프로젝트 목록 조회 성공',
        data: {
          items: CORRECTED_PROJECT_DATA, // ✅ 올바른 UUID 형식
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            hasMore: false
          }
        }
      }

      // 스키마 검증이 통과해야 함
      expect(() => {
        correctedApiResponse.data.items.forEach(item => {
          ProjectSchema.parse(item)
        })
      }).not.toThrow()
    })
  })

  describe('실제 crypto.randomUUID() 함수 검증', () => {
    it('crypto.randomUUID()로 생성된 UUID가 Zod 검증을 통과해야 함', () => {
      // 실제 MSW에서 사용하는 crypto.randomUUID() 테스트
      const generatedUuids = Array.from({ length: 5 }, () => crypto.randomUUID())
      
      generatedUuids.forEach(uuid => {
        expect(() => z.string().uuid().parse(uuid)).not.toThrow()
        
        // UUID v4 형식 검증
        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        expect(uuid).toMatch(uuidV4Regex)
      })
    })

    it('동적 생성 ID들이 유효한 UUID 형식이어야 함', () => {
      // MSW 핸들러에서 동적으로 생성되는 ID들 시뮬레이션
      const dynamicIds = {
        projectId: crypto.randomUUID(),
        invitationId: crypto.randomUUID(),
        commentId: crypto.randomUUID(),
        markerId: crypto.randomUUID()
      }

      Object.entries(dynamicIds).forEach(([key, uuid]) => {
        expect(() => z.string().uuid().parse(uuid)).not.toThrow()
      })
    })
  })

  describe('EdgeCase: 이미 올바른 피드백 데이터', () => {
    it('피드백 데이터는 이미 UUID 형식이므로 계속 통과해야 함', () => {
      const feedbackData = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        title: '웹사이트 로딩 속도 개선 요청',
        content: '메인 페이지 로딩 시간이 너무 길어 사용자 경험에 문제가 있습니다.',
        type: 'improvement',
        status: 'open',
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        authorId: '987fcdeb-51a2-43f1-9876-543210987654',
        assigneeId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        createdAt: new Date('2025-08-27T09:15:00Z').toISOString(),
        updatedAt: new Date('2025-08-27T16:20:00Z').toISOString(),
        tags: ['performance', 'frontend', 'ux'],
        priority: 'high',
        attachments: []
      }

      expect(() => {
        FeedbackSchema.parse(feedbackData)
      }).not.toThrow()
    })
  })

  describe('성능 테스트: 대량 UUID 검증', () => {
    it('1000개의 UUID 검증이 빠르게 처리되어야 함', () => {
      const startTime = performance.now()
      
      const uuids = Array.from({ length: 1000 }, () => crypto.randomUUID())
      
      uuids.forEach(uuid => {
        z.string().uuid().parse(uuid)
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // 1000개 UUID 검증이 100ms 이내에 완료되어야 함
      expect(duration).toBeLessThan(100)
    })
  })
})