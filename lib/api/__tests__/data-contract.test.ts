/**
 * 데이터 계약 검증 테스트 (TDD Red 단계)
 * MSW 모킹 데이터와 Zod 스키마 간 일치성 검증
 */

import { z } from 'zod'
import { ProjectSchema, FeedbackSchema, SubMenuItemSchema } from '@/shared/api/schemas'

// MSW 핸들러에서 사용하는 모킹 데이터 (현재 문제가 있는 상태)
const PROBLEMATIC_PROJECT_DATA = [
  {
    id: 'proj-001', // ❌ UUID가 아닌 형식
    name: '웹사이트 리뉴얼 프로젝트',
    description: '회사 웹사이트 전체 리뉴얼 및 성능 최적화 작업',
    status: 'in-progress',
    createdAt: new Date('2025-08-01T10:00:00Z').toISOString(),
    updatedAt: new Date('2025-08-25T10:30:00Z').toISOString(),
    startDate: new Date('2025-08-01T09:00:00Z').toISOString(),
    endDate: new Date('2025-09-30T18:00:00Z').toISOString(),
    ownerId: 'user-001', // ❌ UUID가 아닌 형식
    tags: ['web', 'frontend', 'ux'],
    priority: 'high',
    progress: 65
  }
]

const PROBLEMATIC_FEEDBACK_DATA = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // ✅ 유효한 UUID
    title: '웹사이트 로딩 속도 개선 요청',
    content: '메인 페이지 로딩 시간이 너무 길어 사용자 경험에 문제가 있습니다.',
    type: 'improvement',
    status: 'open',
    projectId: '123e4567-e89b-12d3-a456-426614174000', // ✅ 유효한 UUID
    authorId: '987fcdeb-51a2-43f1-9876-543210987654', // ✅ 유효한 UUID
    assigneeId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // ✅ 유효한 UUID
    createdAt: new Date('2025-08-27T09:15:00Z').toISOString(),
    updatedAt: new Date('2025-08-27T16:20:00Z').toISOString(),
    tags: ['performance', 'frontend', 'ux'],
    priority: 'high',
    attachments: []
  }
]

const PROBLEMATIC_SUBMENU_DATA = [
  {
    id: 'proj-001', // ❌ UUID가 아닌 형식 (프로젝트 참조)
    name: '웹사이트 리뉴얼 프로젝트',
    path: '/projects/proj-001',
    status: 'active',
    badge: 3,
    lastModified: new Date('2025-08-25T10:30:00Z').toISOString(),
    description: '회사 웹사이트 전체 리뉴얼 작업',
    priority: 'high'
  }
]

describe('데이터 계약 검증 (TDD Red 단계)', () => {
  describe('프로젝트 데이터 계약', () => {
    it('MSW 프로젝트 데이터가 ProjectSchema 검증에 실패해야 함', () => {
      // Red: 현재 데이터는 스키마 검증에 실패해야 함
      expect(() => {
        ProjectSchema.parse(PROBLEMATIC_PROJECT_DATA[0])
      }).toThrow(/유효하지 않은 프로젝트 ID 형식입니다/)
    })

    it('ownerId가 UUID 형식이 아니면 검증 실패해야 함', () => {
      expect(() => {
        ProjectSchema.parse({
          ...PROBLEMATIC_PROJECT_DATA[0],
          id: '123e4567-e89b-12d3-a456-426614174000', // 유효한 UUID로 수정
          ownerId: 'user-001' // ❌ 여전히 유효하지 않은 UUID
        })
      }).toThrow(/Invalid uuid/)
    })
  })

  describe('피드백 데이터 계약', () => {
    it('MSW 피드백 데이터가 FeedbackSchema 검증에 통과해야 함', () => {
      // 피드백 데이터는 이미 올바른 UUID 형식을 사용하므로 통과해야 함
      expect(() => {
        FeedbackSchema.parse(PROBLEMATIC_FEEDBACK_DATA[0])
      }).not.toThrow()
    })
  })

  describe('서브메뉴 데이터 계약', () => {
    it('MSW 서브메뉴 데이터가 SubMenuItemSchema 검증에 통과해야 함', () => {
      // 서브메뉴는 ID가 UUID가 아니어도 되므로 통과해야 함
      expect(() => {
        SubMenuItemSchema.parse(PROBLEMATIC_SUBMENU_DATA[0])
      }).not.toThrow()
    })
  })

  describe('결정론적 UUID 생성 테스트', () => {
    it('crypto.randomUUID()가 유효한 UUID v4를 생성해야 함', () => {
      const uuid = crypto.randomUUID()
      
      // UUID v4 형식 검증: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      
      expect(uuid).toMatch(uuidV4Regex)
      expect(() => z.string().uuid().parse(uuid)).not.toThrow()
    })

    it('고정된 UUID 시드를 사용한 결정론적 UUID 생성', () => {
      // 테스트 환경에서 결정론적 UUID 생성을 위한 고정 시드 사용
      const deterministicUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '987fcdeb-51a2-43f1-9876-543210987654',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'b2c3d4e5-f6a7-8901-bcde-f23456789012',
        'c3d4e5f6-a7b8-9012-cdef-345678901234'
      ]

      deterministicUUIDs.forEach(uuid => {
        expect(() => z.string().uuid().parse(uuid)).not.toThrow()
      })
    })
  })

  describe('API 응답 구조 검증', () => {
    it('프로젝트 API 응답이 예상 구조와 일치하지 않아야 함', () => {
      // 현재 MSW에서 반환하는 구조 (문제 있는 상태)
      const mockApiResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        message: '프로젝트 목록 조회 성공',
        data: {
          items: PROBLEMATIC_PROJECT_DATA, // ❌ 잘못된 UUID 형식
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            hasMore: false
          }
        }
      }

      // 스키마 검증이 실패해야 함
      expect(() => {
        // items 배열의 각 항목이 ProjectSchema를 통과해야 하지만 실패할 것
        mockApiResponse.data.items.forEach(item => {
          ProjectSchema.parse(item)
        })
      }).toThrow()
    })
  })

  describe('UUID 검증 엣지 케이스', () => {
    const invalidUUIDs = [
      'proj-001',                    // 일반 문자열
      '123-456-789',                 // 짧은 형식
      '123e4567-e89b-12d3-a456',    // 불완전한 UUID
      '123e4567-e89b-12d3-a456-426614174000-extra', // 긴 형식
      'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // 잘못된 문자
      ''                             // 빈 문자열
    ]

    it.each(invalidUUIDs)('잘못된 UUID 형식 "%s"이 검증에 실패해야 함', (invalidUUID) => {
      expect(() => {
        z.string().uuid().parse(invalidUUID)
      }).toThrow()
    })

    const validUUIDs = [
      '123e4567-e89b-12d3-a456-426614174000',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
    ]

    it.each(validUUIDs)('올바른 UUID 형식 "%s"이 검증에 통과해야 함', (validUUID) => {
      expect(() => {
        z.string().uuid().parse(validUUID)
      }).not.toThrow()
    })
  })
})