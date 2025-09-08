/**
 * @fileoverview Feedback Comments API Route
 * @description 비디오 피드백 댓글 추가/조회를 위한 API 엔드포인트
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import {
  CreateFeedbackRequestSchema,
  FeedbackQuerySchema,
  validateFeedbackData,
  FeedbackErrorResponseSchema,
  type Feedback,
  type FeedbackAuthor,
} from '@/shared/lib/schemas/feedback.schema'

// 임시 댓글 저장소 (실제로는 데이터베이스 연결 필요)
const feedbacks: Feedback[] = []
const nextFeedbackId = 1

// UUID v4 생성 함수 (임시)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 통합 스키마를 사용한 검증
    const validation = validateFeedbackData(CreateFeedbackRequestSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: '입력 데이터가 올바르지 않습니다.',
          details: validation.errors.map(err => ({
            code: err.code,
            message: err.message,
            path: err.path,
          })),
        },
        { status: 400 }
      )
    }

    const validatedData = validation.data

    // 임시 작성자 정보 (실제로는 인증된 사용자 정보)
    const author: FeedbackAuthor = {
      id: generateUUID(),
      name: 'Test User',
      email: 'test@example.com',
      role: 'reviewer',
    }

    // 피드백 생성
    const newFeedback: Feedback = {
      id: generateUUID(),
      projectId: validatedData.projectId,
      videoId: validatedData.videoId,
      timecode: validatedData.timecode,
      content: validatedData.content,
      type: validatedData.type || 'comment',
      priority: validatedData.priority || 'medium',
      status: 'open',
      tags: validatedData.tags,
      author,
      assignee: validatedData.assigneeId
        ? {
            id: validatedData.assigneeId,
            name: 'Assignee User',
            role: 'reviewer',
          }
        : undefined,
      reactions: [],
      replies: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    feedbacks.push(newFeedback)

    // 타임코드 기준으로 정렬 (null/undefined 안전 처리)
    feedbacks.sort((a, b) => {
      const aTimecode = a.timecode ?? 0
      const bTimecode = b.timecode ?? 0
      return aTimecode - bTimecode
    })

    console.log('Feedback created:', newFeedback)

    return NextResponse.json(
      {
        success: true,
        feedback: newFeedback,
        message: '피드백이 성공적으로 추가되었습니다.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Feedback creation error:', error)

    // 알려지지 않은 서버 에러를 방지하기 위한 안전한 에러 핸들링
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        details:
          process.env.NODE_ENV === 'development'
            ? [
                {
                  code: 'INTERNAL_ERROR',
                  message: error instanceof Error ? error.message : 'Unknown error',
                },
              ]
            : undefined,
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // URL 파라미터를 객체로 변환
    const queryParams = Object.fromEntries(searchParams.entries())

    // 쿼리 파라미터 검증
    const validation = validateFeedbackData(FeedbackQuerySchema, queryParams)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          message: '쿼리 파라미터가 올바르지 않습니다.',
          details: validation.errors.map(err => ({
            code: err.code,
            message: err.message,
            path: err.path,
          })),
        },
        { status: 400 }
      )
    }

    const query = validation.data

    // 필터링 로직
    let filteredFeedbacks = feedbacks

    if (query.projectId) {
      filteredFeedbacks = filteredFeedbacks.filter(feedback => feedback.projectId === query.projectId)
    }

    if (query.videoId) {
      filteredFeedbacks = filteredFeedbacks.filter(feedback => feedback.videoId === query.videoId)
    }

    if (query.type) {
      filteredFeedbacks = filteredFeedbacks.filter(feedback => feedback.type === query.type)
    }

    if (query.priority) {
      filteredFeedbacks = filteredFeedbacks.filter(feedback => feedback.priority === query.priority)
    }

    if (query.status) {
      filteredFeedbacks = filteredFeedbacks.filter(feedback => feedback.status === query.status)
    }

    if (query.authorId) {
      filteredFeedbacks = filteredFeedbacks.filter(feedback => feedback.author.id === query.authorId)
    }

    if (query.tag) {
      filteredFeedbacks = filteredFeedbacks.filter(feedback => feedback.tags?.includes(query.tag!))
    }

    // 정렬 로직
    filteredFeedbacks.sort((a, b) => {
      let aValue: any, bValue: any

      switch (query.sortBy) {
        case 'timecode':
          aValue = a.timecode ?? 0
          bValue = b.timecode ?? 0
          break
        case 'priority':
          const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 }
          aValue = priorityOrder[a.priority]
          bValue = priorityOrder[b.priority]
          break
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime()
          bValue = new Date(b.updatedAt).getTime()
          break
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
      }

      return query.sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })

    // 페이지네이션
    const total = filteredFeedbacks.length
    const limit = query.limit ?? 20
    const page = query.page ?? 1
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const paginatedFeedbacks = filteredFeedbacks.slice(startIndex, startIndex + limit)

    console.log(
      `Retrieved ${total} feedbacks (page ${page}/${totalPages}) with filters:`,
      Object.fromEntries(Object.entries(query).filter(([_, value]) => value !== undefined))
    )

    return NextResponse.json(
      {
        success: true,
        feedbacks: paginatedFeedbacks,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
        message: `${total}개의 피드백을 조회했습니다.`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Feedbacks retrieval error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: '피드백 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        details:
          process.env.NODE_ENV === 'development'
            ? [
                {
                  code: 'INTERNAL_ERROR',
                  message: error instanceof Error ? error.message : 'Unknown error',
                },
              ]
            : undefined,
      },
      { status: 500 }
    )
  }
}
