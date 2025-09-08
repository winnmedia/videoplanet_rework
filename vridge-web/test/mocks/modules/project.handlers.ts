/**
 * 프로젝트 관리 모듈 MSW 핸들러
 * RBAC 권한 매트릭스, SendGrid 통합, 자동 일정 생성 모킹
 */

import { http, HttpResponse, delay } from 'msw'

import { API_BASE_URL } from '../handlers'

// RBAC 권한 매트릭스
const PERMISSIONS = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  INVITE: 'INVITE',
  COMMENT: 'COMMENT',
  APPROVE: 'APPROVE',
  EXPORT: 'EXPORT',
} as const

const ROLES = {
  Owner: [
    PERMISSIONS.CREATE,
    PERMISSIONS.READ,
    PERMISSIONS.UPDATE,
    PERMISSIONS.DELETE,
    PERMISSIONS.INVITE,
    PERMISSIONS.COMMENT,
    PERMISSIONS.APPROVE,
    PERMISSIONS.EXPORT,
  ],
  Admin: [
    PERMISSIONS.CREATE,
    PERMISSIONS.READ,
    PERMISSIONS.UPDATE,
    PERMISSIONS.INVITE,
    PERMISSIONS.COMMENT,
    PERMISSIONS.APPROVE,
  ],
  Editor: [PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.COMMENT],
  Reviewer: [PERMISSIONS.READ, PERMISSIONS.COMMENT, PERMISSIONS.APPROVE],
  Viewer: [PERMISSIONS.READ],
} as const

// Mock 프로젝트 데이터 (단순화)
const mockProjects = [
  {
    id: '1',
    name: 'Brand Video Campaign',
    description: '2025년 브랜드 리뉴얼을 위한 홍보 영상 제작',
    status: 'ACTIVE',
    clientName: '브랜드코퍼레이션',
    budget: 50000,
    startDate: '2025-08-20T00:00:00Z',
    endDate: '2025-09-15T23:59:59Z',
    createdAt: '2025-08-20T09:00:00Z',
    updatedAt: '2025-08-26T14:30:00Z',
  },
  {
    id: '2',
    name: 'Product Demo Video',
    description: '신제품 데모 영상 제작',
    status: 'ACTIVE',
    clientName: '테크컴퍼니',
    budget: 30000,
    startDate: '2025-08-25T00:00:00Z',
    endDate: '2025-09-10T23:59:59Z',
    createdAt: '2025-08-25T10:00:00Z',
    updatedAt: '2025-08-25T10:00:00Z',
  },
]

// 자동 일정 생성 로직
function generateProjectPhases(startDate: string, projectType: 'STANDARD' | 'RUSH' | 'EXTENDED' = 'STANDARD') {
  const start = new Date(startDate)
  const phases = []

  const durations = {
    STANDARD: { planning: 7, shooting: 1, editing: 14, review: 3 }, // 일 단위
    RUSH: { planning: 3, shooting: 1, editing: 7, review: 2 },
    EXTENDED: { planning: 14, shooting: 2, editing: 21, review: 5 },
  }

  const duration = durations[projectType]
  let currentStart = new Date(start)

  // 기획 단계 (1주 or 설정값)
  const planningEnd = new Date(currentStart)
  planningEnd.setDate(planningEnd.getDate() + duration.planning)
  phases.push({
    id: `planning-${Date.now()}`,
    name: '기획',
    type: 'PLANNING',
    startDate: currentStart.toISOString(),
    endDate: planningEnd.toISOString(),
    status: 'PENDING',
    progress: 0,
  })

  // 촬영 단계 (1일 or 설정값)
  currentStart = new Date(planningEnd)
  const shootingEnd = new Date(currentStart)
  shootingEnd.setDate(shootingEnd.getDate() + duration.shooting)
  phases.push({
    id: `shooting-${Date.now()}`,
    name: '촬영',
    type: 'SHOOTING',
    startDate: currentStart.toISOString(),
    endDate: shootingEnd.toISOString(),
    status: 'PENDING',
    progress: 0,
  })

  // 편집 단계 (2주 or 설정값)
  currentStart = new Date(shootingEnd)
  const editingEnd = new Date(currentStart)
  editingEnd.setDate(editingEnd.getDate() + duration.editing)
  phases.push({
    id: `editing-${Date.now()}`,
    name: '편집',
    type: 'EDITING',
    startDate: currentStart.toISOString(),
    endDate: editingEnd.toISOString(),
    status: 'PENDING',
    progress: 0,
  })

  // 검토 단계 (3일 or 설정값)
  currentStart = new Date(editingEnd)
  const reviewEnd = new Date(currentStart)
  reviewEnd.setDate(reviewEnd.getDate() + duration.review)
  phases.push({
    id: `review-${Date.now()}`,
    name: '검토 및 수정',
    type: 'REVIEW',
    startDate: currentStart.toISOString(),
    endDate: reviewEnd.toISOString(),
    status: 'PENDING',
    progress: 0,
  })

  return { phases, estimatedEndDate: reviewEnd.toISOString() }
}

export const projectHandlers = [
  // GET /api/projects - 프로젝트 목록 조회
  http.get(`${API_BASE_URL}/projects`, async () => {
    await delay(200)
    return HttpResponse.json({
      projects: mockProjects,
      total: mockProjects.length,
    })
  }),

  // GET /api/projects/[id] - 프로젝트 단일 조회
  http.get(`${API_BASE_URL}/projects/:id`, async ({ params }) => {
    await delay(200)
    const project = mockProjects.find(p => p.id === params.id)
    if (!project) {
      return HttpResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 })
    }
    return HttpResponse.json(project)
  }),

  // POST /api/projects - 프로젝트 생성 (단순화)
  http.post(`${API_BASE_URL}/projects`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string
      description?: string
      clientName: string
      budget: number
      startDate: string
      endDate: string
    }

    await delay(300)

    const newProject = {
      id: String(mockProjects.length + 1),
      name: body.name,
      description: body.description,
      status: 'ACTIVE' as const,
      clientName: body.clientName,
      budget: body.budget,
      startDate: body.startDate,
      endDate: body.endDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockProjects.push(newProject)
    return HttpResponse.json(newProject, { status: 201 })
  }),

  // PUT /api/projects/[id] - 프로젝트 수정
  http.put(`${API_BASE_URL}/projects/:id`, async ({ request, params }) => {
    const body = await request.json()
    await delay(200)

    const index = mockProjects.findIndex(p => p.id === params.id)
    if (index === -1) {
      return HttpResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 })
    }

    mockProjects[index] = {
      ...mockProjects[index],
      ...body,
      updatedAt: new Date().toISOString(),
    }

    return HttpResponse.json(mockProjects[index])
  }),

  // DELETE /api/projects/[id] - 프로젝트 삭제
  http.delete(`${API_BASE_URL}/projects/:id`, async ({ params }) => {
    await delay(200)

    const index = mockProjects.findIndex(p => p.id === params.id)
    if (index === -1) {
      return HttpResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 })
    }

    mockProjects.splice(index, 1)
    return HttpResponse.json({ message: '프로젝트가 삭제되었습니다' })
  }),
]

// 프로젝트 타입 정의
interface ProjectInput {
  name: string
  description: string
  clientName: string
  budget: number
  startDate: string
  endDate?: string
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'
}

// 테스트 유틸리티 함수들
export const projectTestUtils = {
  getProjects: () => mockProjects,
  addProject: (project: ProjectInput) => {
    const newProject = {
      id: String(mockProjects.length + 1),
      ...project,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockProjects.push(newProject)
    return newProject
  },
  clearProjects: () => {
    mockProjects.length = 0
  },
  getRoles: () => ROLES,
  getPermissions: () => PERMISSIONS,
  generateProjectPhases,
}
