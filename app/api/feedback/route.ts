/**
 * Feedback API Route
 * GET /api/feedback - 피드백 목록 조회
 * POST /api/feedback - 새 피드백 생성
 */

import { NextRequest, NextResponse } from 'next/server'

import { withErrorHandler } from '@/lib/api/error-handler'
import { 
  FeedbacksResponseSchema, 
  FeedbackRequestSchema, 
  FeedbackSchema,
  validateRequest, 
  parseUrlSearchParams,
  FeedbackType 
} from '@/shared/api/schemas'
import { randomUUID } from 'crypto'

// UUID 생성 함수 (브라우저 환경 호환)
function generateUUID(): string {
  // Node.js 환경에서는 crypto.randomUUID() 사용
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  
  // Fallback: 간단한 UUID v4 생성
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 피드백 데이터 (실제로는 데이터베이스에서 가져옴)
const FEEDBACK_DATA: FeedbackType[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    title: '웹사이트 로딩 속도 개선 요청',
    content: '메인 페이지 로딩 시간이 너무 길어 사용자 경험에 문제가 있습니다. 이미지 최적화와 코드 스플리팅을 통한 성능 개선이 필요합니다.',
    type: 'improvement',
    status: 'open',
    projectId: '123e4567-e89b-12d3-a456-426614174000',
    authorId: '987fcdeb-51a2-43f1-9876-543210987654',
    assigneeId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    createdAt: new Date('2025-08-27T09:15:00Z').toISOString(),
    updatedAt: new Date('2025-08-27T16:20:00Z').toISOString(),
    tags: ['performance', 'frontend', 'ux'],
    priority: 'high',
    attachments: ['https://example.com/screenshot1.png']
  },
  {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    title: '모바일 반응형 레이아웃 버그',
    content: '모바일 화면에서 네비게이션 메뉴가 제대로 표시되지 않는 문제가 있습니다. iPhone 13 Pro에서 테스트했을 때 메뉴가 잘려서 보입니다.',
    type: 'bug',
    status: 'in-review',
    projectId: '123e4567-e89b-12d3-a456-426614174000',
    authorId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    assigneeId: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
    createdAt: new Date('2025-08-25T14:30:00Z').toISOString(),
    updatedAt: new Date('2025-08-25T13:45:00Z').toISOString(),
    tags: ['mobile', 'responsive', 'bug'],
    priority: 'medium',
    attachments: ['https://example.com/mobile-bug.png']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: '다크 모드 지원 기능 추가',
    content: '사용자들이 다크 모드를 지원해달라는 요청이 많이 들어오고 있습니다. 시스템 설정에 따른 자동 전환과 수동 토글 기능을 추가해주세요.',
    type: 'feature',
    status: 'open',
    projectId: '456e7890-e89b-12d3-a456-789012345678',
    authorId: 'd4e5f6a7-b8c9-0123-defa-456789012345',
    createdAt: new Date('2025-08-22T11:45:00Z').toISOString(),
    updatedAt: new Date('2025-08-22T10:10:00Z').toISOString(),
    tags: ['feature', 'ui', 'accessibility'],
    priority: 'medium',
    attachments: []
  },
  {
    id: '7b9f9c4f-3a2e-4d5b-9c1a-8f7e6d3c2b1a',
    title: 'API 응답 시간 최적화',
    content: '프로젝트 목록 API의 응답 시간이 3초 이상 걸리고 있습니다. 데이터베이스 쿼리 최적화나 캐싱 전략을 적용해 1초 이내로 개선해주세요.',
    type: 'improvement',
    status: 'resolved',
    projectId: '789e0123-e89b-12d3-a456-012345678901',
    authorId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    assigneeId: '987fcdeb-51a2-43f1-9876-543210987654',
    createdAt: new Date('2025-08-20T08:20:00Z').toISOString(),
    updatedAt: new Date('2025-08-24T15:30:00Z').toISOString(),
    resolvedAt: new Date('2025-08-24T15:30:00Z').toISOString(),
    tags: ['api', 'performance', 'backend'],
    priority: 'high',
    attachments: ['https://example.com/performance-report.pdf']
  },
  {
    id: 'c8e4d3a2-5f7b-4a9c-b2e1-3d4c5b6a7f8e',
    title: '사용자 가이드 문서 업데이트',
    content: '새로운 기능들이 추가되면서 사용자 가이드 문서가 오래되었습니다. 최신 기능들을 반영한 업데이트가 필요합니다.',
    type: 'question',
    status: 'closed',
    authorId: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
    assigneeId: 'd4e5f6a7-b8c9-0123-defa-456789012345',
    createdAt: new Date('2025-08-18T16:10:00Z').toISOString(),
    updatedAt: new Date('2025-08-21T09:45:00Z').toISOString(),
    resolvedAt: new Date('2025-08-21T09:45:00Z').toISOString(),
    tags: ['documentation', 'user-guide'],
    priority: 'low',
    attachments: []
  }
]

export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    // URL 파라미터 파싱 및 검증
    const params = parseUrlSearchParams(request.url)
    const validatedParams = validateRequest(FeedbackRequestSchema, params)
    
    const { 
      page = 1, 
      limit = 10, 
      search, 
      type,
      status, 
      projectId,
      authorId,
      assigneeId,
      sortBy = 'updatedAt', 
      sortOrder = 'desc' 
    } = validatedParams
    
    // 피드백 데이터 필터링
    let filteredFeedback = [...FEEDBACK_DATA]
    
    // 타입 필터링
    if (type) {
      filteredFeedback = filteredFeedback.filter(feedback => feedback.type === type)
    }
    
    // 상태 필터링
    if (status) {
      filteredFeedback = filteredFeedback.filter(feedback => feedback.status === status)
    }
    
    // 프로젝트 필터링
    if (projectId) {
      filteredFeedback = filteredFeedback.filter(feedback => feedback.projectId === projectId)
    }
    
    // 작성자 필터링
    if (authorId) {
      filteredFeedback = filteredFeedback.filter(feedback => feedback.authorId === authorId)
    }
    
    // 담당자 필터링
    if (assigneeId) {
      filteredFeedback = filteredFeedback.filter(feedback => feedback.assigneeId === assigneeId)
    }
    
    // 검색어 필터링
    if (search) {
      const searchTerm = search.toLowerCase()
      filteredFeedback = filteredFeedback.filter(feedback =>
        feedback.title.toLowerCase().includes(searchTerm) ||
        feedback.content.toLowerCase().includes(searchTerm) ||
        feedback.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    }
    
    // 정렬
    filteredFeedback.sort((a, b) => {
      let aVal: string | number, bVal: string | number
      
      switch (sortBy) {
        case 'title':
          aVal = a.title
          bVal = b.title
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'priority':
          // priority 순서: low=1, medium=2, high=3, urgent=4
          const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 }
          aVal = priorityOrder[a.priority]
          bVal = priorityOrder[b.priority]
          break
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
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
    const total = filteredFeedback.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedFeedback = filteredFeedback.slice(startIndex, endIndex)
    const hasMore = endIndex < total
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      message: '피드백 목록 조회 성공',
      data: {
        items: paginatedFeedback,
        pagination: {
          page,
          limit,
          total,
          hasMore
        }
      }
    }
    
    // 스키마 검증
    const validatedResponse = validateRequest(FeedbacksResponseSchema, responseData)
    
    return NextResponse.json(validatedResponse, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=180', // 30초 클라이언트 캐시, 3분 CDN 캐시
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
    const CreateFeedbackSchema = FeedbackSchema.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true
    }).extend({
      title: FeedbackSchema.shape.title,
      content: FeedbackSchema.shape.content,
      type: FeedbackSchema.shape.type,
      authorId: FeedbackSchema.shape.authorId,
      // 선택적 필드들의 기본값 설정
      status: FeedbackSchema.shape.status.default('open'),
      priority: FeedbackSchema.shape.priority.default('medium'),
      tags: FeedbackSchema.shape.tags.default([]),
      attachments: FeedbackSchema.shape.attachments.default([])
    })
    
    const validatedData = validateRequest(CreateFeedbackSchema, body)
    
    // 새 피드백 객체 생성
    const newFeedback: FeedbackType = {
      ...validatedData,
      id: generateUUID(), // UUID 생성
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: validatedData.status ?? 'open', // status 기본값 보장
      priority: validatedData.priority ?? 'medium', // priority 기본값 보장
      attachments: validatedData.attachments ?? [], // attachments 기본값 보장
      tags: validatedData.tags ?? [] // tags 기본값 보장
    }
    
    // 스키마 최종 검증
    const validatedFeedback = validateRequest(FeedbackSchema, newFeedback)
    
    // 실제로는 데이터베이스에 저장
    FEEDBACK_DATA.push(validatedFeedback as FeedbackType)
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      message: '피드백 생성 성공',
      data: {
        items: [validatedFeedback],
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
        'Location': `/api/feedback/${validatedFeedback.id}`
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