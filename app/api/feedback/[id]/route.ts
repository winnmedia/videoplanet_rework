/**
 * 피드백 개별 API - Backend Proxy Pattern
 * 피드백 개별 조회/수정/삭제 기능 제공
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'

import { UpdateFeedbackSchema, validateData } from '@/shared/api'

// GET /api/feedback/[id] - 피드백 단일 조회
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const feedbackId = params.id

    if (!feedbackId) {
      return NextResponse.json(
        {
          error: 'MISSING_PARAMETER',
          message: '피드백 ID가 필요합니다.',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // TODO(human): 실제 Django 백엔드에서 피드백 조회
    // 현재는 Mock 응답으로 TDD Green Phase 지원
    const mockFeedback = {
      id: feedbackId,
      title: '비디오 품질 개선 요청',
      content:
        '현재 비디오의 화질이 다소 흐릿하여 개선이 필요합니다. 특히 텍스트가 보이는 부분에서 가독성이 떨어집니다.',
      type: 'suggestion',
      status: 'open',
      priority: 'high',
      projectId: 'project-123',
      authorId: 'user-456',
      assigneeId: 'user-789',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 일주일 전
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2일 전
      resolvedAt: null,
      tags: ['video-quality', 'ui-improvement'],
    }

    return NextResponse.json(
      {
        success: true,
        data: mockFeedback,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Backend-Source': 'mock-proxy',
          'Cache-Control': 'public, max-age=300', // 5분 캐시
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: '피드백 조회 중 오류가 발생했습니다.',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// PUT /api/feedback/[id] - 피드백 수정
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const feedbackId = params.id
    const body = await request.json()

    // Zod 스키마 검증
    const validation = validateData(UpdateFeedbackSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: `입력 데이터가 유효하지 않습니다. ${validation.error}`,
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // TODO(human): 실제 Django 백엔드로 피드백 수정 요청
    // 현재는 Mock 응답으로 TDD Green Phase 지원
    const updatedFeedback = {
      id: feedbackId,
      ...validation.data,
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedFeedback,
        message: '피드백이 성공적으로 수정되었습니다.',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Backend-Source': 'mock-proxy',
          'Cache-Control': 'no-cache',
        },
      }
    )
  } catch (error) {
    // JSON 파싱 에러 처리
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'JSON_PARSE_ERROR',
          message: '요청 데이터를 파싱할 수 없습니다.',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: '피드백 수정 중 오류가 발생했습니다.',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// DELETE /api/feedback/[id] - 피드백 삭제
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const feedbackId = params.id

    if (!feedbackId) {
      return NextResponse.json(
        {
          error: 'MISSING_PARAMETER',
          message: '피드백 ID가 필요합니다.',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // TODO(human): 실제 Django 백엔드에서 피드백 삭제
    // 현재는 Mock 응답으로 TDD Green Phase 지원
    return NextResponse.json(
      {
        success: true,
        data: {
          id: feedbackId,
          deleted: true,
          deletedAt: new Date().toISOString(),
        },
        message: '피드백이 성공적으로 삭제되었습니다.',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Backend-Source': 'mock-proxy',
          'Cache-Control': 'no-cache',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: '피드백 삭제 중 오류가 발생했습니다.',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
