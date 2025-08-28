/**
 * Individual Project API Route
 * GET /api/projects/[id] - 특정 프로젝트 조회
 * PUT /api/projects/[id] - 프로젝트 수정
 * DELETE /api/projects/[id] - 프로젝트 삭제
 */

import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler, NotFoundError } from '@/lib/api/error-handler'
import { 
  ProjectSchema,
  validateRequest,
  ProjectType 
} from '@/shared/api/schemas'

// 임시 데이터 스토어 (실제로는 데이터베이스)
let PROJECTS_DATA: ProjectType[] = [
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
  }
]

export const GET = withErrorHandler<{ id: string }>(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params
    
    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id) && !id.startsWith('proj-')) {
      throw new NotFoundError(`유효하지 않은 프로젝트 ID 형식: ${id}`)
    }
    
    // 프로젝트 찾기
    const project = PROJECTS_DATA.find(p => p.id === id)
    if (!project) {
      throw new NotFoundError(`프로젝트를 찾을 수 없습니다: ${id}`)
    }
    
    // 스키마 검증
    const validatedProject = validateRequest(ProjectSchema, project)
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      message: '프로젝트 조회 성공',
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
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600',
        'Vary': 'Accept-Encoding',
        'ETag': `"${project.updatedAt}"`
      }
    })
    
  } catch (error) {
    throw error
  }
})

export const PUT = withErrorHandler<{ id: string }>(async (
  request: NextRequest,
  context: { params: { id: string } }
) => {
  try {
    const { id } = await context.params
    
    // 프로젝트 존재 확인
    const projectIndex = PROJECTS_DATA.findIndex(p => p.id === id)
    if (projectIndex === -1) {
      throw new NotFoundError(`프로젝트를 찾을 수 없습니다: ${id}`)
    }
    
    // 요청 본문 파싱
    const body = await request.json()
    
    // 수정 불가능한 필드 제거
    const currentProject = PROJECTS_DATA[projectIndex]
    const updateData = {
      ...body,
      id: currentProject.id, // ID 변경 방지
      createdAt: currentProject.createdAt, // 생성일 변경 방지
      updatedAt: new Date().toISOString() // 수정일 자동 업데이트
    }
    
    // 스키마 검증
    const validatedProject = validateRequest(ProjectSchema, updateData)
    
    // 프로젝트 업데이트
    PROJECTS_DATA[projectIndex] = validatedProject
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      message: '프로젝트 수정 성공',
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
    
    return NextResponse.json(responseData, { status: 200 })
    
  } catch (error) {
    throw error
  }
})

export const DELETE = withErrorHandler<{ id: string }>(async (
  request: NextRequest,
  context: { params: { id: string } }
) => {
  try {
    const { id } = await context.params
    
    // 프로젝트 존재 확인
    const projectIndex = PROJECTS_DATA.findIndex(p => p.id === id)
    if (projectIndex === -1) {
      throw new NotFoundError(`프로젝트를 찾을 수 없습니다: ${id}`)
    }
    
    // 프로젝트 삭제
    const deletedProject = PROJECTS_DATA.splice(projectIndex, 1)[0]
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      message: '프로젝트 삭제 성공',
      data: {
        items: [deletedProject],
        pagination: {
          page: 1,
          limit: 1,
          total: 1,
          hasMore: false
        }
      }
    }
    
    return NextResponse.json(responseData, { status: 200 })
    
  } catch (error) {
    throw error
  }
})

// OPTIONS 요청 처리
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}