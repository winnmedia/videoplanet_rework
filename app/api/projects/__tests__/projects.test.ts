/**
 * 프로젝트 API 테스트
 * TDD 원칙에 따라 단순한 CRUD 테스트
 */

import { NextRequest } from 'next/server'

import { GET as getProjectById, PUT, DELETE } from '../[id]/route'
import { GET, POST } from '../route'

// Mock 데이터 초기화
jest.mock('../../../../shared/lib/db/mock-db', () => ({
  mockDB: {
    projects: {
      findAll: jest.fn(() => [
        {
          id: '1',
          name: 'Test Project',
          description: 'Test Description',
          status: 'ACTIVE',
          clientName: 'Test Client',
          budget: 10000,
          startDate: '2025-09-01T00:00:00Z',
          endDate: '2025-09-30T23:59:59Z',
          createdAt: '2025-09-01T00:00:00Z',
          updatedAt: '2025-09-01T00:00:00Z',
        },
      ]),
      findById: jest.fn((id: string) =>
        id === '1'
          ? {
              id: '1',
              name: 'Test Project',
              description: 'Test Description',
              status: 'ACTIVE',
              clientName: 'Test Client',
              budget: 10000,
              startDate: '2025-09-01T00:00:00Z',
              endDate: '2025-09-30T23:59:59Z',
              createdAt: '2025-09-01T00:00:00Z',
              updatedAt: '2025-09-01T00:00:00Z',
            }
          : null
      ),
      create: jest.fn(data => ({
        ...data,
        id: '2',
        createdAt: '2025-09-01T00:00:00Z',
        updatedAt: '2025-09-01T00:00:00Z',
      })),
      update: jest.fn((id, data) =>
        id === '1'
          ? {
              id: '1',
              name: 'Updated Project',
              updatedAt: '2025-09-01T00:00:00Z',
              ...data,
            }
          : null
      ),
      delete: jest.fn((id: string) => id === '1'),
    },
  },
}))

describe('프로젝트 API', () => {
  describe('GET /api/projects', () => {
    it('프로젝트 목록을 반환해야 함', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(1)
      expect(data.total).toBe(1)
    })
  })

  describe('POST /api/projects', () => {
    it('새 프로젝트를 생성해야 함', async () => {
      const requestBody = {
        name: 'New Project',
        description: 'New Description',
        clientName: 'New Client',
        budget: 20000,
        startDate: '2025-09-01T00:00:00Z',
        endDate: '2025-09-30T23:59:59Z',
      }

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Project')
    })

    it('잘못된 데이터로 400 에러를 반환해야 함', async () => {
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: '' }), // 필수 필드 누락
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/projects/[id]', () => {
    it('단일 프로젝트를 반환해야 함', async () => {
      const request = new NextRequest('http://localhost/api/projects/1')
      const response = await getProjectById(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('1')
    })

    it('존재하지 않는 프로젝트로 404 에러를 반환해야 함', async () => {
      const request = new NextRequest('http://localhost/api/projects/999')
      const response = await getProjectById(request, { params: { id: '999' } })

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/projects/[id]', () => {
    it('프로젝트를 수정해야 함', async () => {
      const request = new NextRequest('http://localhost/api/projects/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Project' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Updated Project')
    })
  })

  describe('DELETE /api/projects/[id]', () => {
    it('프로젝트를 삭제해야 함', async () => {
      const request = new NextRequest('http://localhost/api/projects/1')
      const response = await DELETE(request, { params: { id: '1' } })

      expect(response.status).toBe(200)
    })
  })
})
