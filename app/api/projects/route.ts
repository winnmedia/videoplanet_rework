/**
 * 프로젝트 API - GET, POST
 * 극도로 단순한 구현 - 함수당 15줄 이하
 */

import { NextRequest, NextResponse } from 'next/server'

import { CreateProjectSchema, ProjectListResponseSchema } from '../../../shared/api/schemas'
import { mockDB } from '../../../shared/lib/db/mock-db'

// GET /api/projects - 프로젝트 목록 조회
export async function GET() {
  try {
    const projects = mockDB.projects.findAll()
    const response = ProjectListResponseSchema.parse({
      projects,
      total: projects.length,
    })
    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ error: '프로젝트 목록 조회에 실패했습니다' }, { status: 500 })
  }
}

// POST /api/projects - 프로젝트 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validData = CreateProjectSchema.parse(body)
    const newProject = mockDB.projects.create({ ...validData, status: 'ACTIVE' })
    return NextResponse.json(newProject, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다', details: [] }, { status: 400 })
    }
    return NextResponse.json({ error: '프로젝트 생성에 실패했습니다' }, { status: 500 })
  }
}
