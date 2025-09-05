/**
 * SubMenu API Route
 * GET /api/menu/submenu - 서브메뉴 아이템 조회
 */

import { NextRequest, NextResponse } from 'next/server'

import { withErrorHandler } from '@/lib/api/error-handler'
import { 
  SubMenuResponseSchema, 
  SubMenuRequestSchema,
  validateRequest, 
  parseUrlSearchParams,
  SubMenuItemType
} from '@/shared/api/schemas'

// 모든 서브메뉴 데이터 (실제로는 데이터베이스에서 가져옴)
const SUBMENU_DATA: Record<string, SubMenuItemType[]> = {
  projects: [
    {
      id: 'proj-001',
      name: '웹사이트 리뉴얼 프로젝트',
      path: '/projects/proj-001',
      status: 'active',
      badge: 3,
      lastModified: new Date('2025-08-25T10:30:00Z').toISOString(),
      description: '회사 웹사이트 전체 리뉴얼 작업',
      priority: 'high'
    },
    {
      id: 'proj-002',
      name: '모바일 앱 개발',
      path: '/projects/proj-002',
      status: 'active',
      badge: 1,
      lastModified: new Date('2025-08-20T15:45:00Z').toISOString(),
      description: 'iOS/Android 앱 신규 개발',
      priority: 'medium'
    },
    {
      id: 'proj-003',
      name: '브랜딩 영상 제작',
      path: '/projects/proj-003',
      status: 'completed',
      lastModified: new Date('2025-08-15T09:20:00Z').toISOString(),
      description: '기업 홍보 영상 제작 완료',
      priority: 'medium'
    },
    {
      id: 'proj-004',
      name: 'UI/UX 디자인 시스템',
      path: '/projects/proj-004',
      status: 'active',
      badge: 5,
      lastModified: new Date('2025-08-26T14:15:00Z').toISOString(),
      description: '전사 디자인 시스템 구축',
      priority: 'high'
    },
    {
      id: 'proj-005',
      name: 'API 문서화 프로젝트',
      path: '/projects/proj-005',
      status: 'pending',
      lastModified: new Date('2025-08-18T11:30:00Z').toISOString(),
      description: '백엔드 API 문서 자동화',
      priority: 'low'
    }
  ],
  feedback: [
    {
      id: 'fb-001',
      name: '웹사이트 리뉴얼 피드백',
      path: '/feedback/fb-001',
      status: 'active',
      badge: 2,
      lastModified: new Date('2025-08-27T16:20:00Z').toISOString(),
      description: 'UI/UX 개선 사항 피드백',
      priority: 'high'
    },
    {
      id: 'fb-002',
      name: '모바일 앱 피드백',
      path: '/feedback/fb-002',
      status: 'pending',
      badge: 4,
      lastModified: new Date('2025-08-25T13:45:00Z').toISOString(),
      description: '앱 사용성 개선 요청',
      priority: 'medium'
    },
    {
      id: 'fb-003',
      name: '브랜딩 영상 피드백',
      path: '/feedback/fb-003',
      status: 'completed',
      lastModified: new Date('2025-08-22T10:10:00Z').toISOString(),
      description: '영상 수정 작업 완료',
      priority: 'medium'
    }
  ],
  planning: [
    {
      id: 'plan-001',
      name: '컨셉 기획',
      path: '/planning/concept',
      status: 'active',
      badge: 2,
      lastModified: new Date('2025-08-27T08:30:00Z').toISOString(),
      description: '프로젝트 초기 컨셉 설계',
      priority: 'high'
    },
    {
      id: 'plan-002',
      name: '대본 작성',
      path: '/planning/script',
      status: 'pending',
      lastModified: new Date('2025-08-25T12:15:00Z').toISOString(),
      description: '영상 시나리오 작성 중',
      priority: 'medium'
    },
    {
      id: 'plan-003',
      name: '스토리보드',
      path: '/planning/storyboard',
      status: 'completed',
      lastModified: new Date('2025-08-20T17:45:00Z').toISOString(),
      description: '영상 구성안 완성',
      priority: 'medium'
    },
    {
      id: 'plan-004',
      name: '촬영 리스트',
      path: '/planning/shot-list',
      status: 'draft',
      lastModified: new Date('2025-08-26T09:30:00Z').toISOString(),
      description: '촬영 계획 수립 중',
      priority: 'low'
    }
  ]
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    // URL 파라미터 파싱 및 검증
    const params = parseUrlSearchParams(request.url)
    const validatedParams = validateRequest(SubMenuRequestSchema, params)
    
    const { type, page = 1, limit = 10, search, status, sortBy = 'lastModified', sortOrder = 'desc' } = validatedParams
    
    // 해당 타입의 서브메뉴 데이터 가져오기
    let items = SUBMENU_DATA[type] || []
    
    // 상태 필터링
    if (status) {
      items = items.filter(item => item.status === status)
    }
    
    // 검색어 필터링
    if (search) {
      const searchTerm = search.toLowerCase()
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        (item.description?.toLowerCase().includes(searchTerm))
      )
    }
    
    // 정렬
    items.sort((a, b) => {
      let aVal: string | number, bVal: string | number
      
      switch (sortBy) {
        case 'name':
          aVal = a.name
          bVal = b.name
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'lastModified':
        default:
          aVal = new Date(a.lastModified).getTime()
          bVal = new Date(b.lastModified).getTime()
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      } else {
        return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
      }
    })
    
    // 페이지네이션 계산
    const total = items.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedItems = items.slice(startIndex, endIndex)
    const hasMore = endIndex < total
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      message: `${type} 서브메뉴 조회 성공`,
      data: {
        items: paginatedItems,
        pagination: {
          page,
          limit,
          total,
          hasMore
        }
      }
    }
    
    // 스키마 검증
    const validatedResponse = validateRequest(SubMenuResponseSchema, responseData)
    
    return NextResponse.json(validatedResponse, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300', // 1분 클라이언트 캐시, 5분 CDN 캐시
        'Vary': 'Accept-Encoding',
        'X-Total-Count': total.toString(),
        'X-Page': page.toString(),
        'X-Per-Page': limit.toString()
      }
    })
    
  } catch (error) {
    // 검증 오류나 기타 오류를 상위 에러 핸들러로 전달
    throw error
  }
})

// OPTIONS 요청 처리 (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}