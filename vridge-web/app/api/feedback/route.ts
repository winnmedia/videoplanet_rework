/**
 * 피드백 API - GET, POST
 * 표준화된 응답 형식 및 단순화된 구현
 */

import { NextRequest } from 'next/server'

import { CreateFeedbackSchema, type FeedbackType } from '../../../shared/api/schemas'
import {
  createSuccessResponse,
  createValidationErrorResponse,
  createInternalServerErrorResponse,
} from '../../../shared/lib/api-response'

// 임시 피드백 저장소
const feedbacks: FeedbackType[] = []

// 간단한 ID 생성 함수
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// POST /api/feedback - 피드백 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = CreateFeedbackSchema.safeParse(body)

    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const validatedData = validation.data

    // 피드백 생성
    const newFeedback: FeedbackType = {
      id: generateId(),
      title: validatedData.title,
      content: validatedData.content,
      type: validatedData.type || 'comment',
      status: 'open',
      priority: validatedData.priority || 'medium',
      projectId: validatedData.projectId,
      authorId: generateId(), // 임시 작성자 ID
      assigneeId: validatedData.assigneeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: validatedData.tags || [],
    }

    feedbacks.push(newFeedback)

    return createSuccessResponse(newFeedback, '피드백이 성공적으로 생성되었습니다.', 201)
  } catch (error) {
    return createInternalServerErrorResponse('피드백 생성 중 오류가 발생했습니다.')
  }
}

// GET /api/feedback - 피드백 목록 조회
export async function GET() {
  try {
    const responseData = {
      feedbacks,
      total: feedbacks.length,
    }

    return createSuccessResponse(responseData, '피드백 목록을 성공적으로 조회했습니다.')
  } catch (error) {
    return createInternalServerErrorResponse('피드백 조회 중 오류가 발생했습니다.')
  }
}
