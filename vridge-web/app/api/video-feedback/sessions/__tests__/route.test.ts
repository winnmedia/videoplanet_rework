/**
 * @fileoverview Video Feedback Sessions API Tests
 * @description TDD를 통한 비디오 피드백 세션 API 테스트 (Red → Green → Refactor)
 */

import { NextRequest } from 'next/server'

import { GET, POST } from '../route'

describe('Video Feedback Sessions API', () => {
  describe('POST /api/video-feedback/sessions', () => {
    it('should create a new video feedback session with valid data', async () => {
      const requestData = {
        projectId: '123e4567-e89b-12d3-a456-426614174001',
        title: '테스트 비디오 피드백',
        description: '테스트용 비디오 피드백 세션입니다',
        video: {
          id: crypto.randomUUID(),
          filename: 'test-video.mp4',
          size: 1024000,
          duration: 120,
          width: 1920,
          height: 1080,
          frameRate: 30,
          bitRate: 5000000,
          codec: 'h264',
          mimeType: 'video/mp4',
          uploadedAt: new Date().toISOString(),
          uploadedBy: crypto.randomUUID(),
        },
      }

      const request = new NextRequest('http://localhost:3000/api/video-feedback/sessions', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.session).toBeDefined()
      expect(data.session.id).toBeDefined()
      expect(data.session.projectId).toBe(requestData.projectId)
      expect(data.session.title).toBe(requestData.title)
    })

    it('should return 400 for invalid project ID', async () => {
      const requestData = {
        projectId: 'invalid-uuid',
        title: '테스트 비디오 피드백',
        video: {
          id: crypto.randomUUID(),
          filename: 'test-video.mp4',
          size: 1024000,
          duration: 120,
          width: 1920,
          height: 1080,
          frameRate: 30,
          bitRate: 5000000,
          codec: 'h264',
          mimeType: 'video/mp4',
          uploadedAt: new Date().toISOString(),
          uploadedBy: crypto.randomUUID(),
        },
      }

      const request = new NextRequest('http://localhost:3000/api/video-feedback/sessions', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('projectId')
    })

    it('should return 400 for missing required fields', async () => {
      const requestData = {
        title: '테스트 비디오 피드백',
        // projectId와 video가 누락됨
      }

      const request = new NextRequest('http://localhost:3000/api/video-feedback/sessions', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })

  describe('GET /api/video-feedback/sessions', () => {
    it('should return paginated list of sessions', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-feedback/sessions?page=1&limit=10')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sessions).toBeDefined()
      expect(Array.isArray(data.sessions)).toBe(true)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(10)
    })

    it('should filter sessions by project ID', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174001'
      const request = new NextRequest(`http://localhost:3000/api/video-feedback/sessions?projectId=${projectId}`)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sessions.every((session: Record<string, unknown>) => session.projectId === projectId)).toBe(true)
    })

    it('should return empty array when no sessions exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-feedback/sessions?projectId=non-existent')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sessions).toEqual([])
      expect(data.pagination.total).toBe(0)
    })
  })
})
