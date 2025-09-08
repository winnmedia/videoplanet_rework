/**
 * 프로젝트 개별 API - GET, PUT, DELETE
 * 극도로 단순한 구현 - 함수당 15줄 이하
 */

import { NextRequest, NextResponse } from 'next/server'

import { mockDB } from '../../../../shared/lib/db/mock-db'
import { ProjectIdSchema, UpdateProjectSchema } from '../../../../shared/lib/schemas/project.simple.schema'

// GET /api/projects/[id] - 프로젝트 단일 조회
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const validId = ProjectIdSchema.parse(params.id)
    const project = mockDB.projects.findById(validId)
    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 })
    }
    return NextResponse.json(project)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: '유효하지 않은 프로젝트 ID입니다' }, { status: 400 })
    }
    return NextResponse.json({ error: '프로젝트 조회에 실패했습니다' }, { status: 500 })
  }
}

// PUT /api/projects/[id] - 프로젝트 수정
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const validId = ProjectIdSchema.parse(params.id)
    const body = await request.json()
    const validData = UpdateProjectSchema.parse(body)
    const updatedProject = mockDB.projects.update(validId, validData)

    if (!updatedProject) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 })
    }
    return NextResponse.json(updatedProject)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: '입력 데이터가 올바르지 않습니다', details: [] }, { status: 400 })
    }
    return NextResponse.json({ error: '프로젝트 수정에 실패했습니다' }, { status: 500 })
  }
}

// DELETE /api/projects/[id] - 프로젝트 삭제
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const validId = ProjectIdSchema.parse(params.id)
    const deleted = mockDB.projects.delete(validId)
    if (!deleted) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 })
    }
    return NextResponse.json({ message: '프로젝트가 삭제되었습니다' })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: '유효하지 않은 프로젝트 ID입니다' }, { status: 400 })
    }
    return NextResponse.json({ error: '프로젝트 삭제에 실패했습니다' }, { status: 500 })
  }
}
