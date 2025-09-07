/**
 * Mock 데이터베이스 - Railway 연동 준비용
 * 단순한 메모리 스토리지
 */

import type { SimpleProject } from '../schemas/project.simple.schema'

// Mock 프로젝트 데이터
const mockProjects: SimpleProject[] = [
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

// 단순한 DB 연산들
export const mockDB = {
  projects: {
    findAll: (): SimpleProject[] => mockProjects,

    findById: (id: string): SimpleProject | null => {
      return mockProjects.find(p => p.id === id) || null
    },

    create: (data: Omit<SimpleProject, 'id' | 'createdAt' | 'updatedAt'>): SimpleProject => {
      const newProject: SimpleProject = {
        ...data,
        id: String(mockProjects.length + 1),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mockProjects.push(newProject)
      return newProject
    },

    update: (id: string, data: Partial<SimpleProject>): SimpleProject | null => {
      const index = mockProjects.findIndex(p => p.id === id)
      if (index === -1) return null

      mockProjects[index] = {
        ...mockProjects[index],
        ...data,
        updatedAt: new Date().toISOString(),
      }
      return mockProjects[index]
    },

    delete: (id: string): boolean => {
      const index = mockProjects.findIndex(p => p.id === id)
      if (index === -1) return false

      mockProjects.splice(index, 1)
      return true
    },
  },
}
