/**
 * @fileoverview Video Feedback Comments API Route
 * @description 타임코드 기반 댓글 시스템의 핵심 구현
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { extractTimecodes } from '@/features/video-feedback/lib/timecodeUtils'
import { CommentSchema, CommentStatus } from '@/features/video-feedback/model/feedback.schema'

// ============================================================
// Types & Schemas
// ============================================================

const CreateCommentSchema = z.object({
  content: z.string().min(1, '댓글 내용은 필수입니다.').max(1000, '댓글은 1000자를 초과할 수 없습니다.'),
  author: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    avatarUrl: z.string().url().optional(),
  }),
  status: z.enum(['active', 'edited', 'deleted', 'resolved']).default('active'),
})

// 간단한 인메모리 저장소
const commentsStore = new Map<string, Record<string, unknown>[]>() // sessionId -> comments[]

// ============================================================
// Helper Functions
// ============================================================

/**
 * 댓글 내용에서 타임코드를 추출하고 첫 번째 타임코드를 타임스탬프로 설정
 */
function extractTimestampFromContent(content: string): number | undefined {
  const timecodes = extractTimecodes(content)

  if (timecodes.length > 0) {
    return timecodes[0].timestamp
  }

  return undefined
}

/**
 * 세션 ID 유효성 검증
 */
function isValidSessionId(sessionId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(sessionId)
}

/**
 * 댓글을 타임코드 순으로 정렬
 */
function sortCommentsByTimecode(comments: Record<string, unknown>[]): Record<string, unknown>[] {
  return comments.sort((a, b) => {
    // 타임코드가 없는 댓글은 맨 뒤로
    if (a.timestamp === undefined && b.timestamp === undefined) {
      return new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime()
    }
    if (a.timestamp === undefined) return 1
    if (b.timestamp === undefined) return -1

    // 타임코드 순으로 정렬
    return (a.timestamp as number) - (b.timestamp as number)
  })
}

// ============================================================
// POST - 댓글 추가
// ============================================================

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionId = params.id

    // 세션 ID 검증
    if (!isValidSessionId(sessionId)) {
      return NextResponse.json(
        {
          success: false,
          error: '유효하지 않은 세션 ID입니다.',
        },
        { status: 400 }
      )
    }

    const body = await request.json()

    // 입력 데이터 검증
    const validationResult = CreateCommentSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      return NextResponse.json(
        {
          success: false,
          error: errors.join(', '),
        },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // 댓글 내용에서 타임코드 추출
    const timestamp = extractTimestampFromContent(validatedData.content)

    // 새 댓글 생성
    const commentId = crypto.randomUUID()
    const currentTime = new Date().toISOString()

    const newComment = {
      id: commentId,
      content: validatedData.content,
      timestamp, // 타임코드가 있으면 설정, 없으면 undefined
      status: validatedData.status as CommentStatus,
      createdAt: currentTime,
      createdBy: validatedData.author,
    }

    // Zod 스키마로 최종 검증
    const commentValidation = CommentSchema.safeParse(newComment)

    if (!commentValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: '댓글 데이터 생성 중 오류가 발생했습니다.',
        },
        { status: 500 }
      )
    }

    // 저장소에 댓글 추가
    const existingComments = commentsStore.get(sessionId) || []
    existingComments.push(commentValidation.data)
    commentsStore.set(sessionId, existingComments)

    return NextResponse.json(
      {
        success: true,
        comment: commentValidation.data,
        message: '댓글이 성공적으로 추가되었습니다.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('댓글 추가 오류:', error)

    return NextResponse.json(
      {
        success: false,
        error: '댓글 추가 중 서버 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

// ============================================================
// GET - 댓글 목록 조회
// ============================================================

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionId = params.id

    // 세션 ID 검증
    if (!isValidSessionId(sessionId)) {
      return NextResponse.json(
        {
          success: false,
          error: '유효하지 않은 세션 ID입니다.',
        },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)

    // 쿼리 파라미터 파싱
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')

    // 댓글 가져오기 (세션이 존재하지 않으면 빈 배열 반환)
    const comments = commentsStore.get(sessionId) || []

    let filteredComments = [...comments]

    // 시간 범위로 필터링
    if (startTime && endTime) {
      const start = parseFloat(startTime)
      const end = parseFloat(endTime)

      if (!isNaN(start) && !isNaN(end)) {
        filteredComments = filteredComments.filter(comment => {
          if (comment.timestamp === undefined) return false
          return (comment.timestamp as number) >= start && (comment.timestamp as number) <= end
        })
      }
    }

    // 타임코드 순으로 정렬
    const sortedComments = sortCommentsByTimecode(filteredComments)

    return NextResponse.json({
      success: true,
      comments: sortedComments,
      total: sortedComments.length,
      message: '댓글 목록이 성공적으로 조회되었습니다.',
    })
  } catch (error) {
    console.error('댓글 목록 조회 오류:', error)

    return NextResponse.json(
      {
        success: false,
        error: '댓글 목록 조회 중 서버 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}
