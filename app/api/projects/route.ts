/**
 * 프로젝트 API - Backend Proxy Pattern
 * Django 백엔드와 연계하여 프로젝트 CRUD 제공
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'

import { apiService, type CreateProjectType } from '@/shared/api'

// GET /api/projects - 프로젝트 목록 조회 (Django 백엔드 프록시)
export async function GET() {
  const result = await apiService.getProjects()

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

// POST /api/projects - 프로젝트 생성 (Django 백엔드 프록시)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await apiService.createProject(body as CreateProjectType)

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
