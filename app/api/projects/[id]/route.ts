/**
 * 프로젝트 개별 API - Backend Proxy Pattern
 * Django 백엔드와 연계하여 프로젝트 개별 CRUD 제공
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'

import { apiService, type UpdateProjectType } from '@/shared/api'

// GET /api/projects/[id] - 프로젝트 단일 조회 (Django 백엔드 프록시)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const result = await apiService.getProject(params.id)

  if (result.success) {
    return NextResponse.json(result.data, {
      headers: {
        'X-Backend-Source': result.source || 'unknown',
        'Cache-Control': 'public, max-age=300',
      },
    })
  }

  return NextResponse.json(result.error, {
    status: result.error?.statusCode || 404,
    headers: {
      'X-Error-Source': 'backend-proxy',
    },
  })
}

// PUT /api/projects/[id] - 프로젝트 수정 (Django 백엔드 프록시)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const result = await apiService.updateProject(params.id, body as UpdateProjectType)

    if (result.success) {
      return NextResponse.json(result.data, {
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

// DELETE /api/projects/[id] - 프로젝트 삭제 (Django 백엔드 프록시)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const result = await apiService.deleteProject(params.id)

  if (result.success) {
    return NextResponse.json(result.data, {
      headers: {
        'X-Backend-Source': result.source || 'unknown',
      },
    })
  }

  return NextResponse.json(result.error, {
    status: result.error?.statusCode || 404,
    headers: {
      'X-Error-Source': 'backend-proxy',
    },
  })
}
