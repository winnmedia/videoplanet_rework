/**
 * @fileoverview Feedback Comments API Route
 * @description 비디오 피드백 댓글 추가/조회를 위한 API 엔드포인트
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// 댓글 생성 스키마
const CreateFeedbackSchema = z.object({
  projectId: z.string().min(1, '프로젝트 ID는 필수입니다'),
  videoId: z.string().min(1, '비디오 ID는 필수입니다'),
  timecode: z.number().min(0, '타임코드는 0 이상이어야 합니다'),
  content: z.string().min(1, '댓글 내용을 입력해주세요').max(1000),
  type: z.enum(['comment', 'suggestion', 'issue', 'approval']).default('comment'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  tags: z.array(z.string()).optional(),
})

// 임시 댓글 저장소 (실제로는 데이터베이스 연결 필요)
const feedbacks: Record<string, unknown>[] = []
let nextFeedbackId = 1

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zod 검증
    const validatedData = CreateFeedbackSchema.parse(body)

    // 댓글 생성
    const newFeedback = {
      id: String(nextFeedbackId++),
      ...validatedData,
      author: 'test-user', // 실제로는 인증된 사용자
      authorName: 'Test User',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [],
      reactions: [],
    }

    feedbacks.push(newFeedback)

    // 타임코드 기준으로 정렬
    feedbacks.sort((a, b) => (a.timecode as number) - (b.timecode as number))

    console.log('Feedback created:', newFeedback)

    return NextResponse.json(
      {
        success: true,
        feedback: newFeedback,
        message: '댓글이 성공적으로 추가되었습니다.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Feedback creation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
          message: '입력 데이터가 올바르지 않습니다.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create feedback',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const videoId = searchParams.get('videoId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // 프로젝트/비디오별 댓글 조회 및 타임코드 기준 정렬
    let filteredFeedbacks = feedbacks.filter(feedback => feedback.projectId === projectId)

    if (videoId) {
      filteredFeedbacks = filteredFeedbacks.filter(feedback => feedback.videoId === videoId)
    }

    // 타임코드 기준 오름차순 정렬
    filteredFeedbacks.sort((a, b) => (a.timecode as number) - (b.timecode as number))

    console.log(
      `Retrieved ${filteredFeedbacks.length} feedbacks for project: ${projectId}${videoId ? `, video: ${videoId}` : ''}`
    )

    return NextResponse.json(
      {
        success: true,
        feedbacks: filteredFeedbacks,
        total: filteredFeedbacks.length,
        sorted: 'timecode_asc',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Feedbacks retrieval error:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve feedbacks',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
