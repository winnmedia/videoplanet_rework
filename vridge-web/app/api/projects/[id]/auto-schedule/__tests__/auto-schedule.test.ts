import { NextRequest } from 'next/server'

import { GET, POST } from '../route'

// MSW 모킹은 필요 시 추가
describe('/api/projects/[id]/auto-schedule', () => {
  const mockParams = { params: { id: 'test-project-123' } }

  describe('POST /api/projects/[id]/auto-schedule', () => {
    it('startDate가 주어졌을 때 3단계 자동 일정을 생성해야 함', async () => {
      // Given: 시작날짜가 2025-01-01인 요청
      const request = new NextRequest('http://localhost/api/projects/test-project-123/auto-schedule', {
        method: 'POST',
        body: JSON.stringify({
          startDate: '2025-01-01',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // When: API 호출
      const response = await POST(request, mockParams)
      const result = await response.json()

      // Then: 올바른 응답 구조와 날짜 계산
      expect(response.status).toBe(200)
      expect(result).toEqual({
        success: true,
        schedule: {
          planning: {
            name: '기획',
            startDate: '2025-01-01',
            endDate: '2025-01-07',
            duration: 7,
          },
          shooting: {
            name: '촬영',
            startDate: '2025-01-08',
            endDate: '2025-01-08',
            duration: 1,
          },
          editing: {
            name: '편집',
            startDate: '2025-01-09',
            endDate: '2025-01-22',
            duration: 14,
          },
        },
        totalDuration: 22,
        projectId: 'test-project-123',
      })
    })

    it('유효하지 않은 startDate 형식일 때 400 에러를 반환해야 함', async () => {
      // Given: 잘못된 날짜 형식
      const request = new NextRequest('http://localhost/api/projects/test-project-123/auto-schedule', {
        method: 'POST',
        body: JSON.stringify({
          startDate: 'invalid-date',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // When: API 호출
      const response = await POST(request, mockParams)
      const result = await response.json()

      // Then: 400 에러와 에러 메시지
      expect(response.status).toBe(400)
      expect(result).toEqual({
        success: false,
        error: 'Invalid date format. Please provide date in YYYY-MM-DD format.',
      })
    })

    it('startDate가 누락되었을 때 400 에러를 반환해야 함', async () => {
      // Given: startDate가 없는 요청
      const request = new NextRequest('http://localhost/api/projects/test-project-123/auto-schedule', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // When: API 호출
      const response = await POST(request, mockParams)
      const result = await response.json()

      // Then: 400 에러
      expect(response.status).toBe(400)
      expect(result).toEqual({
        success: false,
        error: 'startDate is required',
      })
    })

    it('월말에서 다음 달로 넘어가는 날짜 계산이 올바르게 작동해야 함', async () => {
      // Given: 1월 25일 시작 (월말 근처)
      const request = new NextRequest('http://localhost/api/projects/test-project-123/auto-schedule', {
        method: 'POST',
        body: JSON.stringify({
          startDate: '2025-01-25',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // When: API 호출
      const response = await POST(request, mockParams)
      const result = await response.json()

      // Then: 월 경계를 올바르게 처리
      expect(response.status).toBe(200)
      expect(result.schedule.planning.endDate).toBe('2025-01-31')
      expect(result.schedule.shooting.startDate).toBe('2025-02-01')
      expect(result.schedule.editing.endDate).toBe('2025-02-15')
    })
  })

  describe('GET /api/projects/[id]/auto-schedule', () => {
    it('자동 일정 생성 설정 정보를 반환해야 함', async () => {
      // Given: GET 요청
      const request = new NextRequest('http://localhost/api/projects/test-project-123/auto-schedule')

      // When: API 호출
      const response = await GET(request, mockParams)
      const result = await response.json()

      // Then: 설정 정보 반환
      expect(response.status).toBe(200)
      expect(result).toEqual({
        success: true,
        config: {
          phases: [
            { name: '기획', duration: 7 },
            { name: '촬영', duration: 1 },
            { name: '편집', duration: 14 },
          ],
          totalDuration: 22,
        },
      })
    })
  })
})
