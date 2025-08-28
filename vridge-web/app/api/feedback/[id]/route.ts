/**
 * Individual Feedback API Route
 * GET /api/feedback/[id] - 특정 피드백 조회
 * PUT /api/feedback/[id] - 피드백 수정
 * DELETE /api/feedback/[id] - 피드백 삭제
 */

import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler, NotFoundError } from '@/lib/api/error-handler'
import { 
  FeedbackSchema,
  validateRequest,
  FeedbackType 
} from '@/shared/api/schemas'

// 임시 데이터 스토어 (실제로는 데이터베이스)
let FEEDBACK_DATA: FeedbackType[] = [
  {
    id: 'fb-001',
    title: '웹사이트 로딩 속도 개선 요청',
    content: '메인 페이지 로딩 시간이 너무 길어 사용자 경험에 문제가 있습니다. 이미지 최적화와 코드 스플리팅을 통한 성능 개선이 필요합니다.',
    type: 'improvement',
    status: 'open',
    projectId: 'proj-001',
    authorId: 'user-001',
    assigneeId: 'user-005',
    createdAt: new Date('2025-08-27T09:15:00Z').toISOString(),
    updatedAt: new Date('2025-08-27T16:20:00Z').toISOString(),
    tags: ['performance', 'frontend', 'ux'],
    priority: 'high',
    attachments: ['https://example.com/screenshot1.png']
  },
  {
    id: 'fb-002',
    title: '모바일 반응형 레이아웃 버그',
    content: '모바일 화면에서 네비게이션 메뉴가 제대로 표시되지 않는 문제가 있습니다.',
    type: 'bug',
    status: 'in-review',
    projectId: 'proj-001',
    authorId: 'user-002',
    assigneeId: 'user-003',
    createdAt: new Date('2025-08-25T14:30:00Z').toISOString(),
    updatedAt: new Date('2025-08-25T13:45:00Z').toISOString(),
    tags: ['mobile', 'responsive', 'bug'],
    priority: 'medium',
    attachments: []
  }
]

export const GET = withErrorHandler<{ id: string }>(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params
    
    // ID 형식 검증
    if (!id || (typeof id !== 'string')) {
      throw new NotFoundError(`유효하지 않은 피드백 ID 형식: ${id}`)
    }
    
    // UUID 또는 fb- 접두사 형식 확인
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const fbIdRegex = /^fb-\d+$/
    
    if (!uuidRegex.test(id) && !fbIdRegex.test(id)) {
      throw new NotFoundError(`유효하지 않은 피드백 ID 형식: ${id}`)
    }
    
    // 피드백 찾기
    const feedback = FEEDBACK_DATA.find(f => f.id === id)
    if (!feedback) {
      throw new NotFoundError(`피드백을 찾을 수 없습니다: ${id}`)
    }
    
    // 스키마 검증
    const validatedFeedback = validateRequest(FeedbackSchema, feedback)
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      message: '피드백 조회 성공',
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
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=180, s-maxage=300',
        'Vary': 'Accept-Encoding',
        'ETag': `"${feedback.updatedAt}"`
      }
    })
    
  } catch (error) {
    throw error
  }
})

export const PUT = withErrorHandler<{ id: string }>(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params
    
    // 피드백 존재 확인
    const feedbackIndex = FEEDBACK_DATA.findIndex(f => f.id === id)
    if (feedbackIndex === -1) {
      throw new NotFoundError(`피드백을 찾을 수 없습니다: ${id}`)
    }
    
    // 요청 본문 파싱
    const body = await request.json()
    
    // 수정 불가능한 필드 보호
    const currentFeedback = FEEDBACK_DATA[feedbackIndex]
    const updateData = {
      ...body,
      id: currentFeedback.id, // ID 변경 방지
      createdAt: currentFeedback.createdAt, // 생성일 변경 방지
      updatedAt: new Date().toISOString() // 수정일 자동 업데이트
    }
    
    // 상태 변경에 따른 resolvedAt 업데이트
    if (body.status === 'resolved' || body.status === 'closed') {
      if (!currentFeedback.resolvedAt) {
        updateData.resolvedAt = new Date().toISOString()
      }
    } else if (body.status === 'open' || body.status === 'in-review') {
      // 재오픈하는 경우 resolvedAt 제거
      updateData.resolvedAt = undefined
    }
    
    // 스키마 검증
    const validatedFeedback = validateRequest(FeedbackSchema, updateData)
    
    // 피드백 업데이트
    FEEDBACK_DATA[feedbackIndex] = validatedFeedback
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      message: '피드백 수정 성공',
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
    
    return NextResponse.json(responseData, { status: 200 })
    
  } catch (error) {
    throw error
  }
})

export const DELETE = withErrorHandler<{ id: string }>(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context.params
    
    // 피드백 존재 확인
    const feedbackIndex = FEEDBACK_DATA.findIndex(f => f.id === id)
    if (feedbackIndex === -1) {
      throw new NotFoundError(`피드백을 찾을 수 없습니다: ${id}`)
    }
    
    // 피드백 삭제
    const deletedFeedback = FEEDBACK_DATA.splice(feedbackIndex, 1)[0]
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      message: '피드백 삭제 성공',
      data: {
        items: [deletedFeedback],
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