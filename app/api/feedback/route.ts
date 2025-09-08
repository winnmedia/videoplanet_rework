/**
 * 피드백 API - Backend Proxy Pattern
 * Django 백엔드와 연계하여 피드백 CRUD 제공
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'

import { apiService, type CreateFeedbackType } from '@/shared/api'

// GET /api/feedback - 피드백 목록 조회 (Django 백엔드 프록시)
export async function GET() {
  const result = await apiService.getFeedbacks()

  if (result.success) {
    return NextResponse.json(result.data, {
      headers: {
        'X-Backend-Source': result.source || 'unknown',
        'Cache-Control': 'public, max-age=60',
      },
    })
  }

  return NextResponse.json(result.error, {
    status: result.error?.statusCode || 500,
    headers: {
      'X-Error-Source': 'backend-proxy',
    },
  })
}

// POST /api/feedback - 피드백 생성 (Django 백엔드 프록시)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await apiService.createFeedback(body as CreateFeedbackType)

    if (result.success) {
      return NextResponse.json(result.data, {
        status: 201,
        headers: {
          'X-Backend-Source': result.source || 'unknown',
        },
      })
    }

    return NextResponse.json(result.error, {
      status: result.error?.statusCode || 400,
      headers: {
        'X-Error-Source': 'backend-proxy',
      },
    })
  } catch (error) {
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
}
