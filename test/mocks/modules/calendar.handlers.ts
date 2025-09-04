/**
 * 캘린더 모듈 MSW 핸들러
 * 촬영 충돌 감지, 프로젝트별 색상, 드래그앤드롭 일정 조정 모킹
 */

import { http, HttpResponse, delay } from 'msw'

import { API_BASE_URL } from '../handlers'

// 프로젝트별 색상 시스템
const projectColors = {
  '1': '#0031ff', // Brand Video
  '2': '#28a745', // Product Demo
  '3': '#dc3545', // Training Video
  '4': '#ffc107', // Social Media
  '5': '#17a2b8'  // Corporate
}

// Mock 일정 데이터
const mockSchedules = [
  {
    id: '1',
    title: '브랜드 영상 촬영',
    projectId: '1',
    projectName: 'Brand Video',
    type: 'SHOOTING',
    startTime: '2025-08-27T09:00:00Z',
    endTime: '2025-08-27T17:00:00Z',
    location: '스튜디오 A',
    participants: [
      { id: '1', name: '관리자', role: 'Director' },
      { id: '2', name: '편집자', role: 'Camera' },
      { id: '4', name: '모델', role: 'Talent' }
    ],
    equipment: ['카메라 2대', '조명 세트', '마이크'],
    notes: '오전 10시 리허설 예정',
    color: projectColors['1'],
    status: 'CONFIRMED',
    createdBy: '1',
    createdAt: '2025-08-25T10:00:00Z'
  }
]

// 일정 타입 정의
interface ScheduleItem {
  id: string
  title: string
  projectId: string
  projectName: string
  type: string
  startTime: string
  endTime: string
  location: string
  participants: Array<{ id: string; name: string; role: string }>
  equipment: string[]
  notes: string
  color: string
  status: string
  createdBy: string
  createdAt: string
}

// 충돌 감지 로직
function detectConflicts(newSchedule: ScheduleItem, existingSchedules: ScheduleItem[]) {
  return []
}

export const calendarHandlers = [
  // 일정 목록 조회
  http.get(`${API_BASE_URL}/calendar/schedules`, async ({ request }) => {
    await delay(200)
    
    return HttpResponse.json({
      schedules: mockSchedules,
      projectColors,
      total: mockSchedules.length
    })
  })
]

// 테스트 유틸리티 함수들
export const calendarTestUtils = {
  getSchedules: () => mockSchedules,
  detectConflicts,
  getProjectColors: () => projectColors
}