/**
 * 프로젝트 상태 관리 API - Backend Proxy Pattern
 * PATCH /api/projects/[id]/status - 프로젝트 상태 변경
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'

import { ProjectStatusSchema, validateData } from '@/shared/api'

// PATCH /api/projects/[id]/status - 프로젝트 상태 변경
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()

    // Zod 스키마 검증
    const statusValidation = validateData(ProjectStatusSchema, body.status)
    if (!statusValidation.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: `유효하지 않은 상태값입니다. ${statusValidation.error}`,
          statusCode: 400,
          timestamp: new Date().toISOString(),
          allowedValues: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
        },
        { status: 400 }
      )
    }

    // TODO(human): 실제 Django 백엔드와의 연동 로직 구현
    // 현재는 Mock 응답으로 TDD Green Phase 지원
    const mockResponse = {
      success: true,
      data: {
        id: params.id,
        status: statusValidation.data,
        updatedAt: new Date().toISOString(),
        message: `프로젝트 상태가 ${statusValidation.data}로 변경되었습니다.`,
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(mockResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Backend-Source': 'mock-proxy',
        'Cache-Control': 'no-cache',
      },
    })
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

    // 기타 서버 에러
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: '서버 내부 오류가 발생했습니다.',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// GET /api/projects/[id]/status - 프로젝트 현재 상태 조회
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // TODO(human): 실제 Django 백엔드에서 프로젝트 상태 조회
    // 현재는 Mock 응답으로 TDD Green Phase 지원
    const mockResponse = {
      success: true,
      data: {
        id: params.id,
        status: 'ACTIVE',
        lastStatusChange: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1일 전
        statusHistory: [
          {
            status: 'ACTIVE',
            changedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            changedBy: 'system',
          },
        ],
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(mockResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Backend-Source': 'mock-proxy',
        'Cache-Control': 'public, max-age=300', // 5분 캐시
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: '상태 조회 중 오류가 발생했습니다.',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
