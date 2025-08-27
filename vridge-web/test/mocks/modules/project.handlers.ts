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
  EXPORT: 'EXPORT'
} as const

const ROLES = {
  Owner: [PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.DELETE, PERMISSIONS.INVITE, PERMISSIONS.COMMENT, PERMISSIONS.APPROVE, PERMISSIONS.EXPORT],
  Admin: [PERMISSIONS.CREATE, PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.INVITE, PERMISSIONS.COMMENT, PERMISSIONS.APPROVE],
  Editor: [PERMISSIONS.READ, PERMISSIONS.UPDATE, PERMISSIONS.COMMENT],
  Reviewer: [PERMISSIONS.READ, PERMISSIONS.COMMENT, PERMISSIONS.APPROVE],
  Viewer: [PERMISSIONS.READ]
} as const

// Mock 프로젝트 데이터
const mockProjects = [
  {
    id: '1',
    name: 'Brand Video Campaign',
    description: '2025년 브랜드 리뉴얼을 위한 홍보 영상 제작',
    status: 'ACTIVE',
    priority: 'HIGH',
    color: '#0031ff',
    budget: 50000,
    currency: 'KRW',
    clientName: '브랜드코퍼레이션',
    startDate: '2025-08-20T00:00:00Z',
    endDate: '2025-09-15T23:59:59Z',
    createdAt: '2025-08-20T09:00:00Z',
    updatedAt: '2025-08-26T14:30:00Z',
    ownerId: '1',
    
    // 자동 생성된 일정
    phases: [
      {
        id: 'planning-1',
        name: '기획',
        type: 'PLANNING',
        startDate: '2025-08-20T09:00:00Z',
        endDate: '2025-08-27T18:00:00Z', // 1주
        status: 'COMPLETED',
        progress: 100
      },
      {
        id: 'shooting-1', 
        name: '촬영',
        type: 'SHOOTING',
        startDate: '2025-08-27T09:00:00Z',
        endDate: '2025-08-28T18:00:00Z', // 1일
        status: 'IN_PROGRESS',
        progress: 60
      },
      {
        id: 'editing-1',
        name: '편집',
        type: 'EDITING', 
        startDate: '2025-08-28T09:00:00Z',
        endDate: '2025-09-11T18:00:00Z', // 2주
        status: 'PENDING',
        progress: 0
      },
      {
        id: 'review-1',
        name: '검토 및 수정',
        type: 'REVIEW',
        startDate: '2025-09-11T09:00:00Z',
        endDate: '2025-09-15T18:00:00Z', // 3일
        status: 'PENDING', 
        progress: 0
      }
    ],
    
    members: [
      {
        id: '1',
        userId: '1',
        userName: '관리자',
        userEmail: 'admin@vridge.com',
        role: 'Owner',
        joinedAt: '2025-08-20T09:00:00Z',
        permissions: ROLES.Owner
      },
      {
        id: '2',
        userId: '2',
        userName: '편집자',
        userEmail: 'editor@vridge.com', 
        role: 'Editor',
        joinedAt: '2025-08-21T10:00:00Z',
        permissions: ROLES.Editor
      }
    ]
  }
]

// 자동 일정 생성 로직
function generateProjectPhases(startDate: string, projectType: 'STANDARD' | 'RUSH' | 'EXTENDED' = 'STANDARD') {
  const start = new Date(startDate)
  const phases = []
  
  const durations = {
    STANDARD: { planning: 7, shooting: 1, editing: 14, review: 3 }, // 일 단위
    RUSH: { planning: 3, shooting: 1, editing: 7, review: 2 },
    EXTENDED: { planning: 14, shooting: 2, editing: 21, review: 5 }
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
    progress: 0
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
    progress: 0
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
    progress: 0
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
    progress: 0
  })
  
  return { phases, estimatedEndDate: reviewEnd.toISOString() }
}

export const projectHandlers = [
  // 프로젝트 생성
  http.post(`${API_BASE_URL}/projects`, async ({ request }) => {
    const body = await request.json() as {
      name: string
      description: string
      clientName: string
      budget: number
      startDate: string
      projectType?: 'STANDARD' | 'RUSH' | 'EXTENDED'
      priority?: 'HIGH' | 'MEDIUM' | 'LOW'
      autoSchedule?: boolean
    }
    
    await delay(400) // 프로젝트 생성 + 자동 일정 생성 시간
    
    // 자동 일정 생성
    const { phases, estimatedEndDate } = generateProjectPhases(
      body.startDate, 
      body.projectType || 'STANDARD'
    )
    
    const newProject = {
      id: String(mockProjects.length + 1),
      name: body.name,
      description: body.description,
      status: 'ACTIVE' as const,
      priority: body.priority || 'MEDIUM' as const,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`, // 랜덤 색상
      budget: body.budget,
      currency: 'KRW',
      clientName: body.clientName,
      startDate: body.startDate,
      endDate: estimatedEndDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: '1', // 현재 사용자 (인증에서 가져와야 함)
      phases: body.autoSchedule !== false ? phases : [],
      members: [
        {
          id: '1',
          userId: '1',
          userName: '관리자',
          userEmail: 'admin@vridge.com',
          role: 'Owner' as const,
          joinedAt: new Date().toISOString(),
          permissions: ROLES.Owner
        }
      ]
    }
    
    mockProjects.push(newProject)
    
    return HttpResponse.json({
      project: newProject,
      autoSchedule: {
        generated: body.autoSchedule !== false,
        phaseCount: phases.length,
        estimatedDuration: Math.ceil(
          (new Date(estimatedEndDate).getTime() - new Date(body.startDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      }
    })
  })
]

// 테스트 유틸리티 함수들
export const projectTestUtils = {
  getProjects: () => mockProjects,
  addProject: (project: any) => {
    const newProject = {
      id: String(mockProjects.length + 1),
      ...project,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    mockProjects.push(newProject)
    return newProject
  },
  clearProjects: () => {
    mockProjects.length = 0
  },
  getRoles: () => ROLES,
  getPermissions: () => PERMISSIONS,
  generateProjectPhases
}