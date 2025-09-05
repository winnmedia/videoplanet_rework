/**
 * Projects API Route
 * GET /api/projects - 프로젝트 목록 조회
 * POST /api/projects - 새 프로젝트 생성
 */

import { NextRequest, NextResponse } from 'next/server'

import { withErrorHandler } from '@/lib/api/error-handler'
import { 
  ProjectsResponseSchema, 
  ProjectRequestSchema, 
  ProjectSchema,
  validateRequest, 
  parseUrlSearchParams,
  ProjectType 
} from '@/shared/api/schemas'

// 프로젝트 데이터 (실제로는 데이터베이스에서 가져옴)
const PROJECTS_DATA: ProjectType[] = [
  {
    id: 'proj-001',
    name: '웹사이트 리뉴얼 프로젝트',
    description: '회사 웹사이트 전체 리뉴얼 및 성능 최적화 작업',
    status: 'in-progress',
    createdAt: new Date('2025-08-01T10:00:00Z').toISOString(),
    updatedAt: new Date('2025-08-25T10:30:00Z').toISOString(),
    startDate: new Date('2025-08-01T09:00:00Z').toISOString(),
    endDate: new Date('2025-09-30T18:00:00Z').toISOString(),
    ownerId: 'user-001',
    tags: ['web', 'frontend', 'ux'],
    priority: 'high',
    progress: 65
  },
  {
    id: 'proj-002',
    name: '모바일 앱 개발',
    description: 'iOS/Android 네이티브 앱 신규 개발',
    status: 'planning',
    createdAt: new Date('2025-08-10T14:30:00Z').toISOString(),
    updatedAt: new Date('2025-08-20T15:45:00Z').toISOString(),
    startDate: new Date('2025-09-01T09:00:00Z').toISOString(),
    endDate: new Date('2025-12-31T18:00:00Z').toISOString(),
    ownerId: 'user-002',
    tags: ['mobile', 'ios', 'android', 'react-native'],
    priority: 'medium',
    progress: 20
  },
  {
    id: 'proj-003',
    name: '브랜딩 영상 제작',
    description: '기업 홍보 및 브랜딩을 위한 영상 콘텐츠 제작',
    status: 'completed',
    createdAt: new Date('2025-07-15T11:20:00Z').toISOString(),
    updatedAt: new Date('2025-08-15T09:20:00Z').toISOString(),
    startDate: new Date('2025-07-15T09:00:00Z').toISOString(),
    endDate: new Date('2025-08-15T18:00:00Z').toISOString(),
    ownerId: 'user-003',
    tags: ['video', 'branding', 'marketing'],
    priority: 'medium',
    progress: 100
  },
  {
    id: 'proj-004',
    name: 'UI/UX 디자인 시스템',
    description: '전사 통합 디자인 시스템 구축 및 컴포넌트 라이브러리 개발',
    status: 'in-progress',
    createdAt: new Date('2025-08-05T16:15:00Z').toISOString(),
    updatedAt: new Date('2025-08-26T14:15:00Z').toISOString(),
    startDate: new Date('2025-08-05T09:00:00Z').toISOString(),
    endDate: new Date('2025-10-31T18:00:00Z').toISOString(),
    ownerId: 'user-004',
    tags: ['design-system', 'ui', 'ux', 'components'],
    priority: 'high',
    progress: 45
  },
  {
    id: 'proj-005',
    name: 'API 문서화 프로젝트',
    description: '백엔드 API 자동 문서화 시스템 구축',
    status: 'draft',
    createdAt: new Date('2025-08-18T09:10:00Z').toISOString(),
    updatedAt: new Date('2025-08-18T11:30:00Z').toISOString(),
    ownerId: 'user-005',
    tags: ['api', 'documentation', 'automation'],
    priority: 'low',
    progress: 5
  }
]

export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    // URL 파라미터 파싱 및 검증
    const params = parseUrlSearchParams(request.url)
    const validatedParams = validateRequest(ProjectRequestSchema, params)
    
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      ownerId, 
      sortBy = 'updatedAt', 
      sortOrder = 'desc' 
    } = validatedParams
    
    // 프로젝트 데이터 필터링
    let filteredProjects = [...PROJECTS_DATA]
    
    // 상태 필터링
    if (status) {
      filteredProjects = filteredProjects.filter(project => project.status === status)
    }
    
    // 소유자 필터링
    if (ownerId) {
      filteredProjects = filteredProjects.filter(project => project.ownerId === ownerId)
    }
    
    // 검색어 필터링
    if (search) {
      const searchTerm = search.toLowerCase()
      filteredProjects = filteredProjects.filter(project =>
        project.name.toLowerCase().includes(searchTerm) ||
        (project.description?.toLowerCase().includes(searchTerm)) ||
        project.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    }
    
    // 정렬
    filteredProjects.sort((a, b) => {
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
        case 'priority':
          // priority 순서: low=1, medium=2, high=3
          const priorityOrder = { low: 1, medium: 2, high: 3 }
          aVal = priorityOrder[a.priority]
          bVal = priorityOrder[b.priority]
          break
        case 'updatedAt':
        default:
          aVal = new Date(a.updatedAt).getTime()
          bVal = new Date(b.updatedAt).getTime()
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      } else {
        return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
      }
    })
    
    // 페이지네이션 계산
    const total = filteredProjects.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedProjects = filteredProjects.slice(startIndex, endIndex)
    const hasMore = endIndex < total
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      message: '프로젝트 목록 조회 성공',
      data: {
        items: paginatedProjects,
        pagination: {
          page,
          limit,
          total,
          hasMore
        }
      }
    }
    
    // 스키마 검증
    const validatedResponse = validateRequest(ProjectsResponseSchema, responseData)
    
    return NextResponse.json(validatedResponse, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'Vary': 'Accept-Encoding',
        'X-Total-Count': total.toString(),
        'X-Page': page.toString(),
        'X-Per-Page': limit.toString()
      }
    })
    
  } catch (error) {
    throw error
  }
})

export const POST = withErrorHandler(async (request: NextRequest) => {
  try {
    // 요청 본문 파싱
    const body = await request.json()
    
    // 필수 필드 검증을 위한 생성 스키마
    const CreateProjectSchema = ProjectSchema.omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      name: ProjectSchema.shape.name,
      // 선택적 필드들을 필수로 만들거나 기본값 설정
      status: ProjectSchema.shape.status.default('draft'),
      priority: ProjectSchema.shape.priority.default('medium'),
      progress: ProjectSchema.shape.progress.default(0)
    })
    
    const validatedData = validateRequest(CreateProjectSchema, body)
    
    // 새 프로젝트 객체 생성
    const newProject: ProjectType = {
      ...validatedData,
      id: `proj-${Date.now()}`, // 실제로는 UUID 생성
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: validatedData.status ?? 'draft', // status 기본값 보장
      tags: validatedData.tags ?? [], // tags 기본값 보장
      priority: validatedData.priority ?? 'medium', // priority 기본값 보장
      progress: validatedData.progress ?? 0 // progress 기본값 보장
    }
    
    // 스키마 최종 검증
    const validatedProject = validateRequest(ProjectSchema, newProject)
    
    // 실제로는 데이터베이스에 저장 (optional 필드들 기본값 설정)
    PROJECTS_DATA.push({
      ...validatedProject,
      tags: validatedProject.tags ?? [],
      priority: validatedProject.priority ?? 'medium',
      progress: validatedProject.progress ?? 0
    } as ProjectType)
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      message: '프로젝트 생성 성공',
      data: {
        items: [validatedProject],
        pagination: {
          page: 1,
          limit: 1,
          total: 1,
          hasMore: false
        }
      }
    }
    
    return NextResponse.json(responseData, { 
      status: 201,
      headers: {
        'Location': `/api/projects/${validatedProject.id}`
      }
    })
    
  } catch (error) {
    throw error
  }
})

// OPTIONS 요청 처리
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}