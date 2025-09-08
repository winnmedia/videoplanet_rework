/**
 * @fileoverview Video Feedback Sessions API Route
 * @description 비디오 피드백 세션 생성 및 조회 API (표준화된 응답 형식)
 * @layer app/api
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import {
  createSuccessResponse,
  createValidationErrorResponse,
  createInternalServerErrorResponse,
} from '../../../../shared/lib/api-response'

// 비디오 메타데이터 스키마 (임시 정의)
const VideoMetadataSchema = z.object({
  filename: z.string().min(1),
  duration: z.number().min(0),
  size: z.number().min(0),
  format: z.string().min(1),
  url: z.string().url().optional(),
})

// ============================================================
// Types & Schemas
// ============================================================

// 단순화된 ID 검증 스키마 (UUID 또는 문자열 허용)
const ProjectIdSchema = z.string().min(1, 'Project ID는 필수입니다').max(255, 'Project ID는 255자를 초과할 수 없습니다')

const CreateSessionSchema = z.object({
  projectId: ProjectIdSchema,
  title: z.string().min(1, '제목은 필수입니다.').max(200, '제목은 200자를 초과할 수 없습니다.'),
  description: z.string().max(2000, '설명은 2000자를 초과할 수 없습니다.').optional(),
  video: VideoMetadataSchema,
})

// 간단한 인메모리 저장소 (단순 구현을 위해)
const sessionsStore = new Map<string, Record<string, unknown>>()

// ============================================================
// POST - 세션 생성
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = CreateSessionSchema.safeParse(body)

    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error)
    }

    const validatedData = validationResult.data

    // 새 세션 생성
    const sessionId = crypto.randomUUID()
    const currentTime = new Date().toISOString()

    const newSession = {
      id: sessionId,
      projectId: validatedData.projectId,
      video: validatedData.video,
      title: validatedData.title,
      description: validatedData.description,
      markers: [],
      comments: [],
      reactions: [],
      participants: [
        {
          id: 'current-user',
          name: '현재 사용자',
          role: 'owner' as const,
          lastSeenAt: currentTime,
        },
      ],
      settings: {
        allowComments: true,
        allowReactions: true,
        allowDownload: false,
        autoplay: false,
        defaultSpeed: '1' as const,
        captionsEnabled: false,
      },
      createdAt: currentTime,
      updatedAt: currentTime,
    }

    // 저장소에 저장
    sessionsStore.set(sessionId, newSession)

    return createSuccessResponse(newSession, '비디오 피드백 세션이 성공적으로 생성되었습니다.', 201)
  } catch (error) {
    return createInternalServerErrorResponse('세션 생성 중 오류가 발생했습니다.')
  }
}

// ============================================================
// GET - 세션 목록 조회
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // 쿼리 파라미터 파싱
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const projectId = searchParams.get('projectId')

    // 모든 세션 가져오기
    let sessions = Array.from(sessionsStore.values())

    // 프로젝트 ID로 필터링
    if (projectId) {
      sessions = sessions.filter(session => session.projectId === projectId)
    }

    // 페이지네이션
    const total = sessions.length
    const startIndex = (page - 1) * limit
    const paginatedSessions = sessions.slice(startIndex, startIndex + limit)

    const responseData = {
      sessions: paginatedSessions,
      pagination: {
        page,
        limit,
        total,
        hasMore: startIndex + limit < total,
      },
    }

    return createSuccessResponse(responseData, '세션 목록이 성공적으로 조회되었습니다.')
  } catch (error) {
    return createInternalServerErrorResponse('세션 목록 조회 중 오류가 발생했습니다.')
  }
}
